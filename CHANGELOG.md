# Changelog

One entry per shipped change a teammate would need to know about. Newest first.
Group by surface: **web**, **android**, **admin**, **infra**, **docs**.

## 2026-11-10

- **android**: Firestore now opens the web app's named database
  (`FIRESTORE_DATABASE_ID`, default matches `firebase-applet-config.json`) so
  the app sees the same accounts as the web login. A build still carrying the
  placeholder `google-services.json` now shows a setup message on sign-in
  instead of a cryptic auth error (`FirebaseSetup.isPlaceholderProject`, unit
  tested). `EmailAccount.provider` recognises `gnmail`.
- **admin**: Admin API opens the web app's named Firestore database
  (`FIRESTORE_DATABASE_ID`); it previously read the empty default database,
  so user detail, usage counts and the audit log never matched web data.
- **web**: `EmailAccount.provider` now includes `gnmail`, and Firestore rules
  accept `gnmail` accounts (provisioned mailboxes are first-class).
- **android**: Premium UI pass — shared motion language (`GazneftMotion`) with
  push/fade screen transitions, sender avatars with stable palette colours,
  shimmer skeletons for inbox/body loading, animated list reordering, unread
  badge moved onto the avatar (text no longer shifts on read), animated
  sign-in entrance, send-button state crossfade, and the sign-in glow redrawn
  as a GPU-cheap radial gradient instead of a 120dp blur.
- **web**: Draft-sharing UI wired to the existing E2E crypto — PIN-protected
  share popover in compose (8-char code, copy, revoke) and shared-draft
  import in the drafts folder (code + PIN, opens in compose). Text only,
  7-day TTL, GNmail users only.

## 2026-10-08

- **android**: Google sign-in / sign-up button on the auth screen (Credential
  Manager + Firebase). Shared `app/debug.keystore` committed so CI and local
  builds share one SHA-1; register it in Firebase and refresh
  `google-services.json` (steps in `mobile/README.md`).
- **android**: Sign-in now reports the real cause (wrong password, account
  exists, weak password, offline, rate limited) instead of the inbox offline
  message. A failed profile-document write no longer fails the sign-in.
- **web**: Landing page rebranded to GNmail, Android section added, dead
  "View Demo"/Pricing/Terms links removed, stock photo replaced by a brand
  gradient (no external download), duplicate `id="ai"` fixed, nav usable on
  phones.
- **web**: Dashboard responsive on phones: sidebar is an overlay under 1024px
  and closes after a tap, header and reading-pane toolbar wrap, row actions
  visible on touch screens.
- **android**: Full UI pass to match the website's design language. New theme
  (brand palette, Anton display font, shapes), vector logo drawn from the web
  `Logo.tsx` paths, website-style auth card, inbox rows with the blue unread
  marker and two-line snippets, reading pane with tonal Reply, discard
  confirmation on Compose. Added `MailFormat` helpers with unit tests.
- **android**: `DraftCrypto` now uses `java.util.Base64` (same output as the Android class, unit-testable on the JVM).
- **android**: Debug build now targets the live Netlify proxy (`https://gazneftgroup.netlify.app`) instead of a local server.
- **android**: Launcher icon and Android 12+ splash use the brand gradient tile.
- **android**: Removed the machine-specific `org.gradle.java.home` from the
  project `gradle.properties` so CI builds; set `JAVA_HOME` locally or put the
  path in `~/.gradle/gradle.properties`.
- **infra**: GitHub Actions workflow `android.yml` runs unit tests and builds a
  debug APK on every push/PR touching `mobile/`; tags `v*` produce a signed
  release APK + AAB when signing secrets are set.
- **infra**: `.gitignore` now excludes Android build output, `local.properties`,
  keystores and APK/AAB files.
- **admin**: Admin API (Express + firebase-admin) with `requireAdmin` claim
  middleware, user management, metrics and provisioning routes, and an
  append-only `adminAuditLog`. Admin dashboard (React) with login, users list
  and user detail pages.
- **web**: PIN-protected shared drafts (`secureDraftShare.ts`, AES-256-GCM with
  PBKDF2); Firestore rules for the `sharedDrafts` collection.
- **docs**: Top-level README rewritten for the team; `ARCHITECTURE.md` added.
