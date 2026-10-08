# GNmail — Android app

Kotlin/Jetpack Compose client for the Gazneftgroup mail platform. Shares the
Firebase project and the IMAP/SMTP proxy API with the web app, so accounts and
data stay in sync across clients.

## Architecture

Clean Architecture, offline-first:

```
ui/        Compose screens + ViewModels (state holders, no business logic)
domain/    Pure Kotlin models
data/      Repositories: Firestore (accounts, auth) + REST proxy (mail ops)
core/      Room cache, Retrofit/OkHttp stack, FCM push, shared primitives
di/        Hilt modules
```

Key decisions (why this scales to ~1M users):

- **Room is the single source of truth.** Screens page out of SQLite via
  Paging 3; the network only writes into the cache through a `RemoteMediator`.
  Users mostly read cached data — the backend is a sync target, not a hot path.
- **Envelope-only sync, lazy bodies.** Lists fetch headers only; the heavy
  HTML body is fetched once per message on open and cached forever.
- **Client-side throttling.** Folder refreshes are rate-limited (60s min
  interval), retries use exponential backoff with full jitter, and sends are
  never auto-retried (no duplicate emails).
- **Push over poll.** FCM notifies devices of new mail; the periodic
  WorkManager sync (30 min, flex-windowed by the OS so devices don't sync in
  waves) is only a fallback.
- **Firebase Auth ID token on every API call** so the proxy can verify the
  caller with firebase-admin.

## Setup

1. In the Firebase console (same project as the web app), add an Android app
   with package `com.gazneftgroup.mail` and download `google-services.json`
   into `app/`.
2. Open the `mobile/` folder in Android Studio (Ladybug+), let Gradle sync.
3. Both debug and release builds call the Netlify proxy
   (`https://gazneftgroup.netlify.app`). To test against a server on your PC
   from the emulator, change the debug `API_BASE_URL` in `app/build.gradle.kts`
   to `http://10.0.2.2:3000`.

### Google sign-in (one-time, Firebase console)

Debug builds are signed with the shared `app/debug.keystore` (committed on
purpose) so every machine and CI produce the same fingerprint:

```
SHA-1:   B6:D2:91:2C:84:DE:31:E7:6F:D4:BD:13:9D:EF:5B:98:A3:18:4C:9A
SHA-256: 2C:D9:7C:FE:72:99:1E:A2:E2:29:1B:B4:54:79:D1:45:E7:10:9C:7C:3E:56:9B:EF:19:50:81:55:02:D3:20:63
```

1. Firebase console > Project settings > Your apps > Android
   (`com.gazneftgroup.mail`) > **Add fingerprint** > paste the SHA-1 (and the
   SHA-256).
2. Authentication > Sign-in method > **Google** must be enabled (it already is
   for the website).
3. Download the refreshed `google-services.json` and replace
   `app/google-services.json`. It now contains an `oauth_client` of type 3;
   the build reads the web client ID from it automatically. Commit it.
4. Until that file is refreshed the Google button shows "Google sign-in isn't
   set up for this build yet" and email/password keeps working.

Release builds need the release keystore's SHA-1 added the same way.

## Tests

```
./gradlew testDebugUnitTest
```
