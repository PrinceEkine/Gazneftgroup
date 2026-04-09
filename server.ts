import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { google } from "googleapis";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google OAuth Setup
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/google/callback`
  );

  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://mail.google.com/' // Full access for IMAP/SMTP
      ]
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Get user info
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Return a script that sends the tokens back to the opener
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
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // API: Send Email (SMTP Proxy)
  app.post("/api/send-email", async (req, res) => {
    const { smtpConfig, mailOptions, authType, accessToken, refreshToken } = req.body;
    
    if (!smtpConfig || !mailOptions) {
      return res.status(400).json({ error: "Missing configuration or mail options" });
    }

    try {
      const transporterOptions: any = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
      };

      if (authType === 'oauth2') {
        let currentAccessToken = accessToken;

        // If we have a refresh token, we can try to get a new access token if needed
        // For simplicity in this demo, we'll assume the client passes a valid one or we'd refresh here
        // In a real app, you'd use oauth2Client.setCredentials({ refresh_token: refreshToken }) 
        // and then oauth2Client.getAccessToken()
        
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
      console.error("SMTP Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Fetch Emails (IMAP Proxy)
  app.post("/api/fetch-emails", async (req, res) => {
    const { imapConfig, folder = "INBOX", limit = 20, authType, accessToken, refreshToken } = req.body;

    if (!imapConfig) {
      return res.status(400).json({ error: "Missing IMAP configuration" });
    }

    const imapOptions: any = {
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.port === 993,
      logger: false,
    };

    if (authType === 'oauth2') {
      let currentAccessToken = accessToken;

      // If we have a refresh token, we can use it to get a new access token
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
        // Fetch last 'limit' messages using sequence range
        const status = await client.status(folder, { messages: true });
        const totalMessages = status.messages || 0;
        
        if (totalMessages > 0) {
          const start = Math.max(1, totalMessages - limit + 1);
          const range = `${start}:*`;

          for await (const msg of client.fetch(range, { envelope: true, source: true })) {
            const parsed = await simpleParser(msg.source);
            messages.push({
              uid: msg.uid,
              seq: msg.seq,
              subject: parsed.subject,
              from: parsed.from?.text,
              to: parsed.to?.text,
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
      console.error("IMAP Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Update Email Flags (Mark as Read/Unread)
  app.post("/api/update-flags", async (req, res) => {
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
      console.error("IMAP Flag Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Test Connection
  app.post("/api/test-connection", async (req, res) => {
    const { config, type } = req.body; // type: 'smtp' or 'imap'
    
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
