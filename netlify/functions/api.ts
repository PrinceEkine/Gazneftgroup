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

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`
);

app.get("/auth/google/url", (req, res) => {
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
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    res.send(`
      <html>
        <body>
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
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send("Authentication failed");
  }
});

// API: Send Email (SMTP Proxy)
app.post("/send-email", async (req, res) => {
  const { smtpConfig, mailOptions, authType, accessToken, refreshToken } = req.body;
  if (!smtpConfig || !mailOptions) return res.status(400).json({ error: "Missing config" });

  try {
    const transporterOptions: any = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
    };

    if (authType === 'oauth2') {
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
app.post("/fetch-emails", async (req, res) => {
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
        const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        client.setCredentials({ refresh_token: refreshToken });
        const { token } = await client.getAccessToken();
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
    const lock = await client.getMailboxLock(folder);
      const messages = [];
      try {
        const status = await client.status(folder, { messages: true });
        const totalMessages = status.messages || 0;
        
        if (totalMessages > 0) {
          const start = Math.max(1, totalMessages - limit + 1);
          const range = `${start}:*`;
          for await (const msg of client.fetch(range, { envelope: true, source: true })) {
            const parsed = await simpleParser(msg.source);
            messages.push({
              uid: msg.uid,
              subject: parsed.subject,
              from: parsed.from?.text,
              date: parsed.date,
              snippet: parsed.text?.substring(0, 100),
              body: parsed.html || parsed.textAsHtml || parsed.text,
              isRead: msg.flags ? msg.flags.has("\\Seen") : false,
              attachments: parsed.attachments.map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                contentId: att.contentId,
                url: `data:${att.contentType};base64,${att.content.toString('base64')}`
              }))
            });
          }
        }
      } finally {
      lock.release();
    }
    await client.logout();
    res.json({ success: true, messages: messages.reverse() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Update Email Flags (Mark as Read/Unread)
app.post("/update-flags", async (req, res) => {
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
        const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        client.setCredentials({ refresh_token: refreshToken });
        const { token } = await client.getAccessToken();
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
app.post("/test-connection", async (req, res) => {
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

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export const handler = serverless(app);
