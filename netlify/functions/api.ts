import express from "express";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import serverless from "serverless-http";
import { google } from "googleapis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const app = express();
app.use(express.json());

// Logging middleware for debugging Netlify path issues
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Helper to get OAuth2 client
const getOAuth2Client = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Missing Google OAuth credentials in environment variables");
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'https://gazneftgroup.netlify.app'}/api/auth/google/callback`
  );
};

// Define routes in a way that handles both /api prefix and no prefix
const router = express.Router();

router.get("/auth/google/url", (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://mail.google.com/'
      ]
    });
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    res.send(`
      <html>
        <body style="background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(tokens)},
                userInfo: ${JSON.stringify(userInfo.data)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="text-align: center;">
            <h2 style="color: #4ade80;">Authentication Successful!</h2>
            <p style="color: #94a3b8;">You can close this window now.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send("Authentication failed: " + error.message);
  }
});

// API: Send Email (SMTP Proxy)
router.post("/send-email", async (req, res) => {
  const { smtpConfig, mailOptions, authType, accessToken, refreshToken } = req.body;
  if (!smtpConfig || !mailOptions) return res.status(400).json({ error: "Missing config" });

  try {
    const transporterOptions: any = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
    };

    if (authType === 'oauth2') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: "Missing Google OAuth credentials in server environment" });
      }
      transporterOptions.auth = {
        type: 'OAuth2',
        user: smtpConfig.user,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: refreshToken,
        accessToken: accessToken
      };
    } else {
      transporterOptions.auth = {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);
    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch Emails (IMAP Proxy)
router.post("/fetch-emails", async (req, res) => {
  const { imapConfig, folder = "INBOX", limit = 20, authType, accessToken, refreshToken } = req.body;
  if (!imapConfig) return res.status(400).json({ error: "Missing config" });

  const imapOptions: any = {
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.port === 993,
    logger: false,
  };

  if (authType === 'oauth2') {
    let currentAccessToken = accessToken;

    if (refreshToken) {
      try {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
          throw new Error("Missing Google OAuth credentials");
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (token) currentAccessToken = token;
      } catch (err) {
        console.error("Failed to refresh token for IMAP:", err);
      }
    }

    imapOptions.auth = {
      user: imapConfig.user,
      accessToken: currentAccessToken
    };
  } else {
    imapOptions.auth = {
      user: imapConfig.user,
      pass: imapConfig.pass,
    };
  }

  const client = new ImapFlow(imapOptions);

    try {
      await client.connect();
      // Use mailboxOpen to ensure the mailbox is selected before locking or fetching
      await client.mailboxOpen(folder);
      const lock = await client.getMailboxLock(folder);
      const messages = [];
      try {
        const status = await client.status(folder, { messages: true });
        const totalMessages = status.messages || 0;
        
        if (totalMessages > 0) {
          const start = Math.max(1, totalMessages - limit + 1);
          const range = `${start}:*`;
          
          try {
            for await (const msg of client.fetch(range, { envelope: true, source: true })) {
              try {
                const parsed = await simpleParser(msg.source);
                messages.push({
                  uid: msg.uid,
                  subject: parsed.subject || "(No Subject)",
                  from: parsed.from?.text || "(Unknown Sender)",
                  date: parsed.date || new Date().toISOString(),
                  snippet: parsed.text?.substring(0, 100) || "",
                  body: parsed.html || parsed.textAsHtml || parsed.text || "",
                  isRead: msg.flags ? msg.flags.has("\\Seen") : false,
                  attachments: parsed.attachments.map(att => ({
                    filename: att.filename || "unnamed-attachment",
                    contentType: att.contentType,
                    size: att.size,
                    contentId: att.contentId,
                    url: `data:${att.contentType};base64,${att.content.toString('base64')}`
                  }))
                });
              } catch (parseError: any) {
                console.warn(`[IMAP] Failed to parse message UID ${msg.uid}:`, parseError.message);
                // Push a placeholder if parsing fails so the UI doesn't break
                messages.push({
                  uid: msg.uid,
                  subject: "(Error parsing message)",
                  from: "(Unknown)",
                  date: new Date().toISOString(),
                  snippet: "This message could not be parsed.",
                  body: "Error parsing message content.",
                  isRead: true
                });
              }
            }
          } catch (fetchError: any) {
            console.error("[IMAP] Fetch command failed:", fetchError);
            throw new Error(`IMAP Fetch failed: ${fetchError.message}`);
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();
      res.json({ success: true, messages: messages.reverse() });
    } catch (error: any) {
      console.error("[IMAP] General Error:", error);
      res.status(500).json({ error: `IMAP Error: ${error.message}` });
    }
  });

// API: Update Email Flags (Mark as Read/Unread)
router.post("/update-flags", async (req, res) => {
  const { imapConfig, uid, flags, action, folder = "INBOX", authType, accessToken, refreshToken } = req.body;

  if (!imapConfig || !uid || !flags || !action) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const imapOptions: any = {
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.port === 993,
    logger: false,
  };

  if (authType === 'oauth2') {
    let currentAccessToken = accessToken;
    if (refreshToken) {
      try {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
          throw new Error("Missing Google OAuth credentials");
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (token) currentAccessToken = token;
      } catch (err) {
        console.error("Failed to refresh token for IMAP Flag Update:", err);
      }
    }
    imapOptions.auth = { user: imapConfig.user, accessToken: currentAccessToken };
  } else {
    imapOptions.auth = { user: imapConfig.user, pass: imapConfig.pass };
  }

  const client = new ImapFlow(imapOptions);

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (action === 'add') {
        await client.messageFlagsAdd({ uid }, flags);
      } else if (action === 'remove') {
        await client.messageFlagsRemove({ uid }, flags);
      } else if (action === 'set') {
        await client.messageFlagsSet({ uid }, flags);
      }
      res.json({ success: true });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Test Connection
router.post("/test-connection", async (req, res) => {
  const { config, type } = req.body;
  try {
    if (type === "smtp") {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      });
      await transporter.verify();
      res.json({ success: true });
    } else {
      const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.port === 993,
        auth: { user: config.user, pass: config.pass },
        logger: false,
      });
      await client.connect();
      await client.logout();
      res.json({ success: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount router on both /api and / to handle different redirect behaviors
app.use("/api", router);
app.use("/", router);

// Catch-all 404 handler that returns JSON
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found", 
    path: req.path,
    method: req.method,
    message: "The requested endpoint does not exist on this function."
  });
});

export const handler = serverless(app);
