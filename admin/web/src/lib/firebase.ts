import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Same Firebase project as the user-facing apps. Values come from
// admin/web/.env.local (VITE_-prefixed vars are the Vite convention).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
