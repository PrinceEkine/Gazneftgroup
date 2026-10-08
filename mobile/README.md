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
3. Debug builds point at `http://10.0.2.2:3000` (the local `npm run dev`
   server through the emulator loopback). Release builds point at the Netlify
   deployment — adjust `API_BASE_URL` in `app/build.gradle.kts` if the domain
   changes.

## Tests

```
./gradlew testDebugUnitTest
```
