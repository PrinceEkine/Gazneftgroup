# GNmail platform architecture

Three clients, one identity plane, one mail plane:

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│  Web app     │   │  Android app │   │  Admin web    │
│  (React)     │   │  (Kotlin)    │   │  (React)      │
└──────┬──────┘   └──────┬───────┘   └──────┬────────┘
       │                 │                  │ admin claim required
       ▼                 ▼                  ▼
  Firebase Auth + Firestore          Admin API (firebase-admin,
  (identity, account configs,        audit log, user management)
   profile data, FCM tokens)
       │                 │
       ▼                 ▼
  IMAP/SMTP proxy (Express, stateless, on Netlify functions)
       │
       ▼
  Mail providers (Gmail / Outlook / custom IMAP — incl. a future
  self-hosted GNmail server, which plugs in as provider "custom")
```

## How this reaches ~1M users

**Managed, horizontally-scaled core.** Firebase Auth and Firestore are
Google-managed and scale past 1M users without capacity planning. All user
state (profiles, linked accounts, templates, drafts, FCM tokens) lives there
under `/users/{uid}`, enforced by security rules — each user can only touch
their own subtree, so there is no fan-out hot spot.

**Stateless mail proxy.** The Express IMAP/SMTP bridge holds no state between
requests, so it scales by replica count. It is the only piece we
operate, and the entire client design exists to keep traffic off it:

1. **Offline-first clients.** The Android app treats Room (SQLite) as the
   single source of truth; Firestore's persistent local cache does the same
   for account data. Most user interactions never generate a request.
2. **Envelope-only lists, lazy bodies.** List syncs carry headers only;
   heavy HTML bodies are fetched once per message on open, then cached.
3. **Push, not poll.** FCM tells devices when there is new mail. The
   periodic WorkManager sync (30 min, OS flex windows that naturally spread
   a million devices over time) is a fallback, not the mechanism.
4. **Client-side throttling.** Folder refreshes are rate-limited (60s),
   retries use exponential backoff with full jitter (no thundering herd),
   and sends are never auto-retried (no duplicate emails).
5. **Cursor pagination everywhere.** Paging 3 + RemoteMediator on mobile;
   Firebase Auth pageToken cursors in the admin API. Nothing does offset
   scans or unbounded reads.

**Hardening the proxy for the next order of magnitude** (recommended v2 work,
in priority order):

- Verify the Firebase ID token (already sent by the mobile client as
  `Authorization: Bearer`) in the proxy with firebase-admin, and read account
  credentials server-side from Firestore instead of accepting them in request
  bodies — removes secrets from client payloads entirely.
- Add per-user rate limiting + request coalescing at the proxy.
- Move OAuth token refresh into the proxy with a short-lived token cache
  (Redis/Upstash) so a hot account refreshes once, not per device.
- Drop the 150MB JSON body limit in favor of multipart uploads to object
  storage for attachments.

## Running our own mail service (GNmail addresses)

Feasible, and the architecture already anticipates it: the platform treats
any IMAP/SMTP endpoint as a `custom` provider, so a mail server we operate
plugs into all three clients with zero client changes.

Realistic path:

1. **Domain + DNS**: MX, SPF, DKIM, DMARC records on a dedicated sending
   domain (e.g. `gnmail.app`). Warm up sending IPs gradually — deliverability
   reputation is earned over weeks, not configured.
2. **Server**: start with a modern all-in-one stack — **Stalwart**
   (Rust, JMAP+IMAP+SMTP, designed for horizontal scale) or **Mailcow /
   Mailu** (Postfix+Dovecot bundles). Object-storage-backed mail stores keep
   disk from becoming the bottleneck.
3. **Provisioning**: when a user registers, an admin-API endpoint creates
   `{handle}@gnmail.app` on the mail server and writes the account doc under
   `/users/{uid}/accounts` — the apps pick it up automatically.
4. **Reality check**: outbound deliverability, abuse/spam handling, and
   IP reputation are the actual product cost of running mail — budget for a
   relay service (SES/Postmark) for outbound during the first year.

## Hosting plan (Cloudflare, pre-domain)

Target platform is Cloudflare; no domain is owned yet. The split that fits:

- **Frontends (main web app, admin dashboard)** → Cloudflare Pages. Static
  Vite builds, free `*.pages.dev` URLs until a domain exists, global CDN by
  default.
- **IMAP/SMTP proxy and admin API** → these need a real Node runtime.
  `imapflow`/`nodemailer` hold long-lived TCP/TLS connections, which
  Cloudflare Workers (and Vercel functions) are the wrong shape for. Host
  them on Railway, Render, Fly.io, or Cloud Run and front them with
  Cloudflare (free tier is fine). The existing `netlify.toml` deploy is
  legacy and can be retired once this is up.
- **Domain**: not needed to launch — `*.pages.dev` URLs work for web, and
  the Android app just needs the proxy's URL in `API_BASE_URL`. It becomes
  mandatory the moment the native GNmail mail service starts (MX/SPF/DKIM/
  DMARC records require an owned domain). Cloudflare Registrar sells at
  wholesale cost and puts DNS in the same dashboard — buy the domain there
  when ready.
- One config point per client: `API_BASE_URL` (Android), the Vite dev proxy /
  fetch base (web), `ADMIN_WEB_ORIGINS` (admin API CORS). Swapping
  `*.pages.dev` for the real domain later is a config change, not a refactor.

## Native GNmail accounts + PIN-protected draft sharing

**Native accounts.** `POST /api/provision/gnmail` (admin API) atomically
claims a handle in `/gnmailHandles/{handle}` (Firestore `create()` makes the
race safe across replicas), creates the mailbox on our mail server
(Stalwart-compatible management API, `admin/api/src/mailserver.ts`), and
links it under `/users/{uid}/accounts` with `provider: "gnmail"`. Existing
web/Android account listeners pick it up with zero client changes.

**Draft sharing (GNmail users only, E2E encrypted).** A sharer picks a 4–8
digit PIN; the draft is encrypted client-side (AES-256-GCM, key =
PBKDF2-HMAC-SHA256(PIN, salt, 150k iterations)) and published under an
8-character share code in `/sharedDrafts/{code}` with a 7-day TTL. The
recipient — who must be a signed-in GNmail user per Firestore rules — enters
code + PIN to decrypt locally. Servers and admins only ever see ciphertext;
a wrong PIN fails GCM authentication rather than producing garbage.
Implementations: `src/lib/secureDraftShare.ts` (web, WebCrypto) and
`core/crypto/DraftCrypto.kt` + `data/draftshare/SharedDraftRepository.kt`
(Android) — byte-compatible, so shares cross platforms.

## Data management & compliance

- Admin actions are restricted by a signed `admin: true` custom claim
  (server-verified, revocable within seconds via refresh-token revocation).
- Every privileged action is recorded in an append-only `adminAuditLog`.
- User deletion is full erasure: auth record + recursive delete of the
  `/users/{uid}` tree (accounts, cached mail, templates, drafts, tokens).
- Admin UI never receives mail credentials — account listings are metadata
  only.
