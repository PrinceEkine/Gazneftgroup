import crypto from "node:crypto";

/**
 * Client for OUR mail server's management API (Stalwart-compatible REST).
 * This is what makes "@gnmail.app" accounts real: creating a principal here
 * creates a private IMAP/SMTP mailbox on infrastructure we control — mail
 * never touches Google or Microsoft.
 *
 * Config (env):
 *   MAILSERVER_ADMIN_URL   e.g. https://mail.gnmail.app:8080
 *   MAILSERVER_ADMIN_TOKEN admin bearer token
 *   GNMAIL_DOMAIN          e.g. gnmail.app
 *   GNMAIL_IMAP_HOST/PORT, GNMAIL_SMTP_HOST/PORT  (what client apps connect to)
 */
const BASE_URL = process.env.MAILSERVER_ADMIN_URL;
const TOKEN = process.env.MAILSERVER_ADMIN_TOKEN;

export const GNMAIL_DOMAIN = process.env.GNMAIL_DOMAIN ?? "gnmail.app";

export const gnmailEndpoints = {
  imapHost: process.env.GNMAIL_IMAP_HOST ?? `imap.${GNMAIL_DOMAIN}`,
  imapPort: Number(process.env.GNMAIL_IMAP_PORT ?? 993),
  smtpHost: process.env.GNMAIL_SMTP_HOST ?? `smtp.${GNMAIL_DOMAIN}`,
  smtpPort: Number(process.env.GNMAIL_SMTP_PORT ?? 465),
};

export function isMailServerConfigured(): boolean {
  return Boolean(BASE_URL && TOKEN);
}

/** 24 random bytes, URL-safe — the mailbox app-password handed to the client apps. */
export function generateMailboxPassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  if (!BASE_URL || !TOKEN) {
    throw new Error("Mail server not configured (MAILSERVER_ADMIN_URL / MAILSERVER_ADMIN_TOKEN)");
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Mail server ${init.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response;
}

/** Creates (or errors if taken) an individual mailbox principal. */
export async function createMailbox(handle: string, password: string, displayName?: string) {
  await call("/api/principal", {
    method: "POST",
    body: JSON.stringify({
      type: "individual",
      name: handle,
      description: displayName ?? handle,
      secrets: [password],
      emails: [`${handle}@${GNMAIL_DOMAIN}`],
      quota: 1024 * 1024 * 1024, // 1 GiB starter quota
    }),
  });
}

export async function deleteMailbox(handle: string) {
  await call(`/api/principal/${encodeURIComponent(handle)}`, { method: "DELETE" });
}
