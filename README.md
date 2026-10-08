# GNmail (Gazneftgroup Mail)

GNmail is Gazneftgroup's private mail platform. Today it unifies a user's
existing mailboxes (Gmail, Outlook, custom IMAP) behind one encrypted, AI-assisted
client. The goal is for GNmail to become a **first-party mail service**: users get
a private `@gnmail` address on infrastructure the company controls, as an
alternative to Gmail, with end-to-end encryption so that Gazneftgroup servers
cannot read user content.

> New here? Read this file, then [ARCHITECTURE.md](ARCHITECTURE.md). Each
> sub-project has its own README with run instructions.

## What we are building

| Surface | Audience | Code | Status |
| --- | --- | --- | --- |
| **Web app** | End users | [`src/`](src/) (React + Vite), [`server.ts`](server.ts) + [`netlify/`](netlify/) (IMAP/SMTP proxy) | Live (legacy deploy on Netlify, moving to Cloudflare) |
| **Android app** | End users | [`mobile/`](mobile/) (Kotlin, Jetpack Compose) | In development, CI builds APKs |
| **Admin website** | Gazneftgroup staff only | [`admin/web`](admin/web/) (React) + [`admin/api`](admin/api/) (Express + firebase-admin) | In development |

Standing product rules (do not regress these):

1. GNmail-native accounts are private and encrypted. Prefer designs where the
   server never sees plaintext.
2. Drafts can be shared between GNmail users only, protected by a PIN. The
   crypto is identical on web ([`src/lib/secureDraftShare.ts`](src/lib/secureDraftShare.ts))
   and Android (`core/crypto/DraftCrypto.kt`).
3. Provider `gnmail` accounts are first-class next to `gmail`, `outlook`, `custom`.
4. User-facing name is **GNmail**. The company name is Gazneftgroup.

## How the pieces fit

```
End users                                   Staff
┌───────────┐  ┌─────────────┐              ┌─────────────┐
│  Web app  │  │ Android app │              │ Admin web   │
└─────┬─────┘  └──────┬──────┘              └──────┬──────┘
      │ Firebase Auth │                            │ Firebase Auth + admin claim
      ▼               ▼                            ▼
   Firestore  (users/{uid}/…  accounts, drafts, templates, FCM tokens)
      │               │                     Admin API ──► adminAuditLog
      ▼               ▼                     (only component with a service account)
   IMAP/SMTP proxy  (stateless Express; Netlify functions today)
      ▼
   Gmail / Outlook / custom IMAP / future GNmail mail server
```

The user clients never talk to a privileged backend. Everything staff can do
goes through the Admin API, which requires the `admin: true` custom claim and
writes every mutation to an append-only audit log. Details and the scaling
rationale are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Running things

| Task | Command |
| --- | --- |
| Web app | `npm install && npm run dev` (needs `GEMINI_API_KEY` in `.env.local`) |
| Mail proxy locally | `npm run dev` also serves `server.ts`; see [`netlify/`](netlify/) for the deployed functions |
| Android app | Open `mobile/` in Android Studio, or `cd mobile && ./gradlew assembleDebug` |
| Admin API + dashboard | See [admin/README.md](admin/README.md) (bootstrap the first admin with `npm run grant-admin`) |

The Android debug build points at `http://10.0.2.2:3000` (the emulator's
loopback to your machine). The release URL is a placeholder until the
Cloudflare domain exists; see the `TODO(hosting)` in
[`mobile/app/build.gradle.kts`](mobile/app/build.gradle.kts).

## Design language

The website is the reference. The Android app copies its tokens rather than
inventing new ones:

- Colours: blue `#2563EB` to cyan `#0891B2` brand gradient on the slate neutral
  scale (Tailwind slate 50 to 950). Dark mode is slate-950 / slate-900.
- Type: **Anton** (uppercase) for display text and the wordmark, system sans for
  body. Android bundles Anton in `mobile/app/src/main/res/font`.
- Components: the auth card, the unread blue dot with glow, blue bold dates on
  unread rows, tonal blue action buttons, hairline `slate-200` dividers.

On Android these live in `mobile/app/src/main/java/com/gazneftgroup/mail/ui/theme`
and `ui/components`. Change the web first, then mirror.

## Audit trail

Every change to the platform must be traceable. Three places to look:

1. **Git history.** One logical change per commit, scoped prefix in the subject
   (`feat(mobile): …`, `fix(admin): …`, `feat(imap): …`). CI runs on every push
   to `main` and every pull request ([`.github/workflows/android.yml`](.github/workflows/android.yml)).
2. **[CHANGELOG.md](CHANGELOG.md).** Human-readable summary per date, grouped by
   surface. Add a line when you ship something a teammate would need to know.
3. **Admin audit log.** Every staff action taken through the Admin API is
   written to the `adminAuditLog` Firestore collection with who, what, when and
   the target user. It is append-only by security rules; the dashboard reads it.

Secrets never go in git. `google-services.json` is committed deliberately
(Firebase web/Android config is public by design and locked down by security
rules). Service-account keys, signing keystores and `.env*` files are ignored and
must be provided through environment variables or GitHub secrets.

## Hosting

Production is moving from Netlify to Cloudflare. No domain is owned yet, so do
not hard-code one. When the domain exists: update the Android release
`API_BASE_URL`, the web deploy target and the OAuth redirect URIs in Firebase.
