import {
  collection, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * PIN-protected draft sharing between GNmail users.
 *
 * Security model — true end-to-end encryption:
 *  - The draft {to, subject, body} is encrypted CLIENT-SIDE with AES-256-GCM.
 *  - The key is derived from the sharer's PIN via PBKDF2-HMAC-SHA256
 *    (150k iterations, random 16-byte salt).
 *  - Firestore only ever stores ciphertext + salt + IV. Neither Gazneftgroup
 *    servers nor an admin can read a shared draft: without the PIN there is
 *    no key. The PIN travels out-of-band (the sharer tells the recipient).
 *  - Reading requires GNmail sign-in (Firestore rules), so shares are only
 *    importable by GNmail users, and GCM authentication rejects wrong PINs.
 *
 * The exact same parameters are implemented in the Android app
 * (core/crypto/DraftCrypto.kt) — shares interoperate across platforms.
 */

const KDF_ITERATIONS = 150_000;
const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ShareableDraft {
  to: string;
  subject: string;
  body: string;
}

export interface DraftShareReceipt {
  /** 8-char code the recipient types (case-insensitive, no 0/O/1/I). */
  code: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypts the draft with the PIN and publishes it. Returns the share code. */
export async function shareDraft(draft: ShareableDraft, pin: string): Promise<DraftShareReceipt> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in to share drafts");
  if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4–8 digits");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(draft))
  );

  const code = randomCode();
  await setDoc(doc(collection(getFirestore(), "sharedDrafts"), code), {
    ownerUid: user.uid,
    alg: "AES-256-GCM",
    kdf: `PBKDF2-SHA256/${KDF_ITERATIONS}`,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + SHARE_TTL_MS).toISOString(),
  });

  return { code };
}

/** Fetches and decrypts a shared draft. Throws on unknown code, expiry, or wrong PIN. */
export async function importDraft(code: string, pin: string): Promise<ShareableDraft> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Sign in to import drafts");

  const snapshot = await getDoc(
    doc(getFirestore(), "sharedDrafts", code.trim().toUpperCase())
  );
  if (!snapshot.exists()) throw new Error("No shared draft with that code");

  const data = snapshot.data();
  if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
    throw new Error("This share has expired");
  }

  const key = await deriveKey(pin, fromBase64(data.salt));
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(data.iv) as BufferSource },
      key,
      fromBase64(data.ciphertext) as BufferSource
    );
  } catch {
    // GCM auth failure — wrong PIN. Deliberately indistinguishable from tampering.
    throw new Error("Incorrect PIN");
  }
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/** Sharer can revoke a share early. */
export async function revokeShare(code: string): Promise<void> {
  await deleteDoc(doc(getFirestore(), "sharedDrafts", code.trim().toUpperCase()));
}
