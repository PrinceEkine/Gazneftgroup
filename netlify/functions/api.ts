import express from "express";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import serverless from "serverless-http";
import { google } from "googleapis";
import axios from "axios";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Microsoft OAuth Setup
router.get("/auth/microsoft/url", (req, res) => {
  try {
    if (!MICROSOFT_CLIENT_ID) {
      throw new Error("Missing MICROSOFT_CLIENT_ID in environment");
    }
    const redirectUri = `${process.env.APP_URL || 'https://gazneftgroup.netlify.app'}/api/auth/microsoft/callback`;
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://outlook.office365.com/IMAP.AccessAsUser.All',
      'https://outlook.office365.com/SMTP.Send'
    ].join(' ');

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&prompt=consent`;
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/auth/microsoft/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const redirectUri = `${process.env.APP_URL || 'https://gazneftgroup.netlify.app'}/api/auth/microsoft/callback`;
    
    const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
      new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID!,
        client_secret: MICROSOFT_CLIENT_SECRET!,
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokens = tokenResponse.data;

    const userInfoResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const userInfo = userInfoResponse.data;

    res.send(`
      <html>
        <body style="background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'MICROSOFT_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(tokens)},
                userInfo: ${JSON.stringify({
                  email: userInfo.mail || userInfo.userPrincipalName,
                  name: userInfo.displayName
                })}
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
    console.error("Microsoft OAuth Error:", error?.response?.data || error.message);
    res.status(500).send("Authentication failed");
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
      let currentAccessToken = accessToken;
      let currentClientId = GOOGLE_CLIENT_ID;
      let currentClientSecret = GOOGLE_CLIENT_SECRET;

      const isMicrosoft = smtpConfig.host.includes('office365') || smtpConfig.host.includes('outlook');

      if (isMicrosoft) {
        currentClientId = MICROSOFT_CLIENT_ID;
        currentClientSecret = MICROSOFT_CLIENT_SECRET;

        if (refreshToken) {
          try {
            const refreshResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
              new URLSearchParams({
                client_id: MICROSOFT_CLIENT_ID!,
                client_secret: MICROSOFT_CLIENT_SECRET!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }).toString(),
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            currentAccessToken = refreshResponse.data.access_token;
          } catch (err) {
            console.error("Failed to refresh Microsoft token for SMTP:", err);
          }
        }
      }

      transporterOptions.auth = {
        type: 'OAuth2',
        user: smtpConfig.user,
        clientId: currentClientId,
        clientSecret: currentClientSecret,
        refreshToken: refreshToken,
        accessToken: currentAccessToken
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
    console.error("SMTP Error:", error);
    let errorMessage = error.message;
    if (errorMessage.includes("552-5.7.0") || errorMessage.includes("security issue")) {
      errorMessage = "The email was blocked by the provider (e.g. Gmail) because the attachment contains a potential security risk. This often happens with ZIP files containing scripts (.js), executables (.exe), or other restricted file types. Try removing those files or sharing via a cloud link (Google Drive/Dropbox).";
    }
    res.status(500).json({ error: errorMessage });
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
    const isMicrosoft = imapConfig.host.includes('office365') || imapConfig.host.includes('outlook');

    if (isMicrosoft) {
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
            new URLSearchParams({
              client_id: MICROSOFT_CLIENT_ID!,
              client_secret: MICROSOFT_CLIENT_SECRET!,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          currentAccessToken = refreshResponse.data.access_token;
        } catch (err) {
          console.error("Failed to refresh Microsoft token for IMAP:", err);
        }
      }
    } else {
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
            // ONLY fetch envelope and flags for the list view - MUCH FASTER
            for await (const msg of client.fetch(range, { envelope: true, flags: true })) {
              messages.push({
                uid: msg.uid,
                seq: msg.seq,
                subject: msg.envelope.subject || "(No Subject)",
                from: msg.envelope.from?.map(f => f.name ? `${f.name} <${f.address}>` : f.address).join(", ") || "(Unknown Sender)",
                to: msg.envelope.to?.map(t => t.address).join(", "),
                date: msg.envelope.date || new Date().toISOString(),
                snippet: "",
                body: "",
                isRead: msg.flags ? msg.flags.has("\\Seen") : false,
                attachments: []
              });
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

// API: Fetch Single Message Body (IMAP Proxy)
router.post("/fetch-message-body", async (req, res) => {
  const { imapConfig, uid, folder = "INBOX", authType, accessToken, refreshToken } = req.body;

  if (!imapConfig || !uid) {
    return res.status(400).json({ error: "Missing configuration or UID" });
  }

  const imapOptions: any = {
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.port === 993,
    logger: false,
  };

  if (authType === 'oauth2') {
    let currentAccessToken = accessToken;
    const isMicrosoft = imapConfig.host.includes('office365') || imapConfig.host.includes('outlook');

    if (isMicrosoft && refreshToken) {
      try {
        const refreshResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
          new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID!,
            client_secret: MICROSOFT_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        currentAccessToken = refreshResponse.data.access_token;
      } catch (err) {
        console.error("Failed to refresh Microsoft token for Body Fetch:", err);
      }
    } else if (!isMicrosoft && refreshToken) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (token) currentAccessToken = token;
      } catch (err) {
        console.error("Failed to refresh Google token for Body Fetch:", err);
      }
    }

    imapOptions.auth = { user: imapConfig.user, accessToken: currentAccessToken };
  } else {
    imapOptions.auth = { user: imapConfig.user, pass: imapConfig.pass };
  }

  const client = new ImapFlow(imapOptions);

  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const lock = await client.getMailboxLock(folder);
    
    let messageData = null;
    try {
      const msg = await client.fetchOne(uid.toString(), { source: true }, { uid: true });
      if (msg && msg.source) {
        const parsed = await simpleParser(msg.source);
        messageData = {
          snippet: parsed.text?.substring(0, 100) || "",
          body: parsed.html || parsed.textAsHtml || parsed.text || "",
          attachments: parsed.attachments.map(att => ({
            filename: att.filename || "unnamed-attachment",
            contentType: att.contentType,
            size: att.size,
            contentId: att.contentId,
            url: `data:${att.contentType};base64,${att.content.toString('base64')}`
          }))
        };
      }
    } finally {
      lock.release();
    }

    await client.logout();
    if (messageData) {
      res.json({ success: true, ...messageData });
    } else {
      res.status(404).json({ error: "Message not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    const isMicrosoft = imapConfig.host.includes('office365') || imapConfig.host.includes('outlook');

    if (isMicrosoft) {
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
            new URLSearchParams({
              client_id: MICROSOFT_CLIENT_ID!,
              client_secret: MICROSOFT_CLIENT_SECRET!,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          currentAccessToken = refreshResponse.data.access_token;
        } catch (err) {
          console.error("Failed to refresh Microsoft token for IMAP Flag Update:", err);
        }
      }
    } else {
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
    }
    imapOptions.auth = { user: imapConfig.user, accessToken: currentAccessToken };
  } else {
    imapOptions.auth = { user: imapConfig.user, pass: imapConfig.pass };
  }

  const client = new ImapFlow(imapOptions);

  try {
    await client.connect();
    await client.mailboxOpen(folder);
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
