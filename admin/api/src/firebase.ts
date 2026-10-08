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
export const adminDb = getFirestore(app);
