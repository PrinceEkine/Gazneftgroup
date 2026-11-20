/**
 * Bootstrap the first admin (custom claims can only be set server-side):
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npm run grant-admin -- admin@gazneftgroup.com
 */
import { adminAuth } from "../src/firebase.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run grant-admin -- <email>");
  process.exit(1);
}

const user = await adminAuth.getUserByEmail(email);
await adminAuth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
console.log(`Granted admin to ${email} (${user.uid}).`);
console.log("They must sign out and back in (or refresh their token) for the claim to apply.");
