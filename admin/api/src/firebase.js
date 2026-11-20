import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * firebase-admin bypasses Firestore security rules by design; every route in
 * this service MUST therefore sit behind the requireAdmin middleware.
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key
 * path locally, or rely on Application Default Credentials on Cloud Run/GCE.
 * FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON) is supported for platforms
 * without file mounts (e.g. Netlify/Render env vars).
 */
const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const app = initializeApp({
  credential: inlineJson ? cert(JSON.parse(inlineJson)) : applicationDefault(),
});

export const adminAuth = getAuth(app);

/**
 * Named-database rule: the web app reads/writes a NON-default Firestore
 * database (see firebase-applet-config.json `firestoreDatabaseId`), so the
 * admin API must open that same database or it will see an empty project
 * (zero accounts, zero audit history). Override with FIRESTORE_DATABASE_ID
 * when the project moves.
 */
const databaseId =
  process.env.FIRESTORE_DATABASE_ID ?? "ai-studio-8d1e68ad-6f15-40e6-9245-d509752bfc2d";
console.log(`[admin-api] using Firestore database "${databaseId}"`);
export const adminDb = getFirestore(app, databaseId);
