import { Router } from "express";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "../firebase.js";

export const metricsRouter = Router();

/**
 * GET /api/metrics — headline numbers for the dashboard.
 *
 * Total registered users comes from a maintained counter document rather than
 * enumerating Auth users (listUsers is for paging through people, not for
 * counting a million of them). The counter is updated by the sign-up path
 * (profile-doc creation) and reconciled by the nightly reconcile script.
 */
metricsRouter.get("/", async (_req, res) => {
  const [statsDoc, usersCount, recentAudit] = await Promise.all([
    adminDb.collection("stats").doc("global").get(),
    adminDb.collection("users").count().get(),
    adminDb
      .collection("adminAuditLog")
      .orderBy("at", "desc")
      .limit(20)
      .get(),
  ]);

  res.json({
    totalUsers: usersCount.data().count,
    stats: statsDoc.exists ? statsDoc.data() : {},
    recentAdminActions: recentAudit.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data();
      return {
        id: d.id,
        action: data.action,
        targetUid: data.targetUid,
        actorEmail: data.actorEmail,
        at: data.at?.toDate?.()?.toISOString() ?? null,
      };
    }),
  });
});
