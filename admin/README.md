# GNmail Admin

Two services:

- `api/` — privileged backend (Express + firebase-admin). The ONLY component
  with service-account access. Every route requires a Firebase ID token
  carrying the `admin: true` custom claim; every mutation is written to an
  append-only `adminAuditLog` collection.
- `web/` — the dashboard (React + Vite + Tailwind). Signs in with Firebase
  Auth against the same project as GNmail, then calls the API with the
  admin's ID token.

## First-time setup

1. Create a service-account key in the Firebase console
   (Project settings → Service accounts) and save it OUTSIDE the repo.
2. Bootstrap the first admin:

   ```bash
   cd admin/api
   npm install
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
     npm run grant-admin -- you@gazneftgroup.com
   ```

3. Run the API: `npm run dev` (port 4000; same credentials env var).
4. Run the web app:

   ```bash
   cd admin/web
   npm install
   cp .env.example .env.local   # fill in the Firebase web config
   npm run dev                  # port 5173, /api proxied to :4000
   ```

The granted admin must sign out/in once so their token picks up the claim.

## Capabilities

- Browse all users (cursor-paginated — constant cost at any user count)
- Exact-email lookup
- Per-user detail: profile, linked mail accounts (metadata only, never
  credentials), cached message / template / draft counts via Firestore
  COUNT aggregation
- Disable / enable users (disable also revokes refresh tokens — live
  sessions die within seconds)
- Grant / revoke admin role (self-revocation and self-deletion are blocked)
- Full user deletion: auth record + recursive Firestore subtree (GDPR erasure)
- Dashboard: total users, recent admin actions (from the audit log)

## Deployment

Deploy `api/` to a Node host (Railway/Render/Fly/Cloud Run — it needs a real
Node runtime, not Cloudflare Workers) and keep the service-account JSON out
of images (env var or ADC). Deploy `web/` as a static Vite build on
Cloudflare Pages (a `*.pages.dev` URL works fine until a domain is bought),
with `ADMIN_WEB_ORIGINS` on the API set to the dashboard's origin. Keep the dashboard on a non-guessable subdomain and behind
your team's SSO/VPN if available — the claim check is the security boundary,
but reducing exposure is free.
