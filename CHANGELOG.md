# Changelog

One entry per shipped change a teammate would need to know about. Newest first.
Group by surface: **web**, **android**, **admin**, **infra**, **docs**.

## 2026-10-08

- **android**: Full UI pass to match the website's design language. New theme
  (brand palette, Anton display font, shapes), vector logo drawn from the web
  `Logo.tsx` paths, website-style auth card, inbox rows with the blue unread
  marker and two-line snippets, reading pane with tonal Reply, discard
  confirmation on Compose. Added `MailFormat` helpers with unit tests.
- **android**: `DraftCrypto` now uses `java.util.Base64` (same output as the Android class, unit-testable on the JVM).
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
