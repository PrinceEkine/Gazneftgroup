import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "../firebase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUid?: string;
      adminEmail?: string;
    }
  }
}

/**
 * Admin gate: verifies the Firebase ID token AND the `admin: true` custom
 * claim. Claims live inside the signed token, so this check costs no extra
 * network round-trip per request.
 *
 * `checkRevoked` is deliberately enabled: when an admin is off-boarded
 * (revokeRefreshTokens), their existing tokens stop working within seconds
 * rather than living out their 1-hour lifetime.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token" });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    if (decoded.admin !== true) {
      return res.status(403).json({ error: "Admin privileges required" });
    }
    req.adminUid = decoded.uid;
    req.adminEmail = decoded.email;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
