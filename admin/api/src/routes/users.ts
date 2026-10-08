import { Router } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "../firebase.js";
import { audit } from "../audit.js";

export const usersRouter = Router();

/**
 * GET /api/users?pageToken=&limit=
 * Cursor-paginated user listing straight from Firebase Auth (the identity
 * source of truth). Cursor pagination stays O(page) no matter how many users
 * exist — offset pagination would fall over long before 1M.
 */
usersRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 1000);
  const pageToken = typeof req.query.pageToken === "string" ? req.query.pageToken : undefined;

  const result = await adminAuth.listUsers(limit, pageToken);
  res.json({
    users: result.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      disabled: u.disabled,
      emailVerified: u.emailVerified,
      isAdmin: u.customClaims?.admin === true,
      createdAt: u.metadata.creationTime,
      lastSignInAt: u.metadata.lastSignInTime,
    })),
    nextPageToken: result.pageToken ?? null,
  });
});

/** GET /api/users/lookup?email= — exact-match search by email. */
usersRouter.get("/lookup", async (req, res) => {
  const email = z.string().email().safeParse(req.query.email);
  if (!email.success) return res.status(400).json({ error: "Invalid email" });
  try {
    const u = await adminAuth.getUserByEmail(email.data);
    res.json({
      user: {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        disabled: u.disabled,
        isAdmin: u.customClaims?.admin === true,
        createdAt: u.metadata.creationTime,
        lastSignInAt: u.metadata.lastSignInTime,
      },
    });
  } catch {
    res.status(404).json({ error: "No user with that email" });
  }
});

/**
 * GET /api/users/:uid — profile + per-collection usage counts.
 * Uses Firestore COUNT aggregation: the server counts index entries and
 * returns a single number, so this stays cheap even for users with huge
 * mailbox caches.
 */
usersRouter.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const userRecord = await adminAuth.getUser(uid);
    const userDoc = adminDb.collection("users").doc(uid);

    const [accountsSnap, messagesCount, templatesCount, draftsCount] = await Promise.all([
      userDoc.collection("accounts").get(),
      userDoc.collection("messages").count().get(),
      userDoc.collection("templates").count().get(),
      userDoc.collection("drafts").count().get(),
    ]);

    res.json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        disabled: userRecord.disabled,
        emailVerified: userRecord.emailVerified,
        isAdmin: userRecord.customClaims?.admin === true,
        createdAt: userRecord.metadata.creationTime,
        lastSignInAt: userRecord.metadata.lastSignInTime,
      },
      usage: {
        linkedAccounts: accountsSnap.docs.map((d: QueryDocumentSnapshot) => {
          const data = d.data();
          // Never ship credentials to the admin UI — metadata only.
          return {
            id: d.id,
            email: data.email,
            provider: data.provider,
            authType: data.authType ?? "password",
            lastSynced: data.lastSynced ?? null,
          };
        }),
        cachedMessages: messagesCount.data().count,
        templates: templatesCount.data().count,
        drafts: draftsCount.data().count,
      },
    });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

/** POST /api/users/:uid/disable | /enable — suspend or restore sign-in. */
usersRouter.post("/:uid/disable", async (req, res) => {
  const { uid } = req.params;
  await adminAuth.updateUser(uid, { disabled: true });
  // Kill live sessions too — the mobile/web token refresh will fail immediately.
  await adminAuth.revokeRefreshTokens(uid);
  await audit(req, "user.disable", uid);
  res.json({ success: true });
});

usersRouter.post("/:uid/enable", async (req, res) => {
  const { uid } = req.params;
  await adminAuth.updateUser(uid, { disabled: false });
  await audit(req, "user.enable", uid);
  res.json({ success: true });
});

/** POST /api/users/:uid/admin  body: { admin: boolean } — grant/revoke admin. */
usersRouter.post("/:uid/admin", async (req, res) => {
  const body = z.object({ admin: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Body must be { admin: boolean }" });
  const { uid } = req.params;
  if (uid === req.adminUid && !body.data.admin) {
    return res.status(400).json({ error: "You cannot revoke your own admin access" });
  }
  const existing = (await adminAuth.getUser(uid)).customClaims ?? {};
  await adminAuth.setCustomUserClaims(uid, { ...existing, admin: body.data.admin });
  await audit(req, body.data.admin ? "user.grantAdmin" : "user.revokeAdmin", uid);
  res.json({ success: true });
});

/**
 * DELETE /api/users/:uid — full GDPR-style erasure: auth record plus the
 * entire /users/{uid} document tree (accounts, cached messages, templates,
 * drafts, fcm tokens). recursiveDelete handles arbitrarily large subtrees
 * with its own batching.
 */
usersRouter.delete("/:uid", async (req, res) => {
  const { uid } = req.params;
  if (uid === req.adminUid) {
    return res.status(400).json({ error: "You cannot delete your own account from here" });
  }
  await adminAuth.deleteUser(uid).catch((e) => {
    if (e.code !== "auth/user-not-found") throw e;
  });
  await adminDb.recursiveDelete(adminDb.collection("users").doc(uid));
  await audit(req, "user.delete", uid);
  res.json({ success: true });
});
