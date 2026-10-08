import type { Request } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase.js";

/**
 * Append-only audit trail of every privileged action. Non-negotiable in an
 * admin surface: when a user account is disabled or deleted, you must be able
 * to answer who did it, when, and to whom.
 */
export async function audit(req: Request, action: string, targetUid: string) {
  await adminDb.collection("adminAuditLog").add({
    action,
    targetUid,
    actorUid: req.adminUid ?? "unknown",
    actorEmail: req.adminEmail ?? "unknown",
    ip: req.ip ?? null,
    at: FieldValue.serverTimestamp(),
  });
}
