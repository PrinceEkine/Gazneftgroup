import { Router } from "express";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { z } from "zod";
import { audit } from "../audit.js";
import { adminAuth, adminDb } from "../firebase.js";
import {
  GNMAIL_DOMAIN,
  createMailbox,
  deleteMailbox,
  generateMailboxPassword,
  gnmailEndpoints,
  isMailServerConfigured,
} from "../mailserver.js";

export const provisionRouter = Router();

const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?$/, "lowercase letters, digits, single dots");

const RESERVED = new Set(["admin", "root", "postmaster", "abuse", "support", "info", "noreply", "gnmail"]);

/**
 * POST /api/provision/gnmail  body: { uid, handle }
 *
 * Creates the user's private @gnmail.app mailbox on OUR mail server and links
 * it as a provider:"gnmail" account under /users/{uid}/accounts — the web and
 * Android apps pick it up through their existing account listeners with zero
 * client changes.
 *
 * The handle registry (/gnmailHandles/{handle}) makes uniqueness atomic:
 * two concurrent claims race on a create() of the same doc ID and exactly
 * one wins, regardless of how many API replicas are running.
 */
provisionRouter.post("/gnmail", async (req, res) => {
  const body = z.object({ uid: z.string().min(1), handle: handleSchema }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid body" });
  }
  const { uid, handle } = body.data;

  if (RESERVED.has(handle)) return res.status(409).json({ error: "That handle is reserved" });
  if (!isMailServerConfigured()) {
    return res.status(503).json({ error: "GNmail mail server is not configured yet" });
  }

  const userRecord = await adminAuth.getUser(uid).catch(() => null);
  if (!userRecord) return res.status(404).json({ error: "User not found" });

  const address = `${handle}@${GNMAIL_DOMAIN}`;
  const registryRef = adminDb.collection("gnmailHandles").doc(handle);

  // Atomic claim — throws ALREADY_EXISTS if someone else owns the handle.
  try {
    await registryRef.create({ uid, claimedAt: FieldValue.serverTimestamp() });
  } catch {
    return res.status(409).json({ error: "That handle is already taken" });
  }

  const mailboxPassword = generateMailboxPassword();
  try {
    await createMailbox(handle, mailboxPassword, userRecord.displayName ?? undefined);
  } catch (e) {
    await registryRef.delete(); // roll back the claim
    throw e;
  }

  // Link the mailbox as a normal account doc; clients treat provider:"gnmail"
  // like "custom" (plain IMAP/SMTP) but can badge it as a native address.
  const accountRef = await adminDb
    .collection("users").doc(uid)
    .collection("accounts")
    .add({
      ownerUid: uid,
      email: address,
      provider: "gnmail",
      authType: "password",
      password: mailboxPassword,
      imapHost: gnmailEndpoints.imapHost,
      imapPort: gnmailEndpoints.imapPort,
      smtpHost: gnmailEndpoints.smtpHost,
      smtpPort: gnmailEndpoints.smtpPort,
      label: `GNmail · ${address}`,
      color: "#0EA5E9",
      createdAt: FieldValue.serverTimestamp(),
    });

  await audit(req, "gnmail.provision", uid);
  res.json({ success: true, address, accountId: accountRef.id });
});

/** DELETE /api/provision/gnmail/:handle — decommission a native mailbox. */
provisionRouter.delete("/gnmail/:handle", async (req, res) => {
  const handle = handleSchema.safeParse(req.params.handle);
  if (!handle.success) return res.status(400).json({ error: "Invalid handle" });

  const registry = await adminDb.collection("gnmailHandles").doc(handle.data).get();
  if (!registry.exists) return res.status(404).json({ error: "Handle not found" });
  const uid = registry.get("uid") as string;

  await deleteMailbox(handle.data);
  await registry.ref.delete();

  const accounts = await adminDb
    .collection("users").doc(uid)
    .collection("accounts")
    .where("email", "==", `${handle.data}@${GNMAIL_DOMAIN}`)
    .get();
  await Promise.all(accounts.docs.map((d: QueryDocumentSnapshot) => d.ref.delete()));

  await audit(req, "gnmail.deprovision", uid);
  res.json({ success: true });
});
