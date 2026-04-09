import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { google } from "googleapis";
import axios from "axios";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google OAuth Setup
  const getOAuth2Client = () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Missing Google OAuth credentials in environment variables");
    }
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    );
  };

  app.get("/api/auth/google/url", (req, res) => {
    try {
      const oauth2Client = getOAuth2Client();
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const oauth2Client = getOAuth2Client();
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

  // Microsoft OAuth Setup
  app.get("/api/auth/microsoft/url", (req, res) => {
    try {
      if (!MICROSOFT_CLIENT_ID) {
        throw new Error("Missing MICROSOFT_CLIENT_ID");
      }
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`;
      const scopes = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'https://outlook.office.com/IMAP.AccessAsUser.All',
        'https://outlook.office.com/SMTP.Send'
      ].join(' ');

      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&prompt=consent`;
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`;
      
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

      // Get user info from ID token or Graph
      const userInfoResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      const userInfo = userInfoResponse.data;

      res.send(`
        <html>
          <body>
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
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Microsoft OAuth Error:", error?.response?.data || error.message);
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
        let currentClientId = GOOGLE_CLIENT_ID;
        let currentClientSecret = GOOGLE_CLIENT_SECRET;

        // Determine if it's Google or Microsoft based on host or a flag
        const isMicrosoft = smtpConfig.host.includes('office365') || smtpConfig.host.includes('outlook');

        if (isMicrosoft) {
          currentClientId = MICROSOFT_CLIENT_ID;
          currentClientSecret = MICROSOFT_CLIENT_SECRET;

          // Refresh Microsoft token if needed
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

      const isMicrosoft = imapConfig.host.includes('office365') || imapConfig.host.includes('outlook');

      if (isMicrosoft) {
        // Refresh Microsoft token
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
        // Refresh Google token
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
      
      // Try to open the requested folder
      let targetFolder = folder;
      try {
        await client.mailboxOpen(targetFolder);
      } catch (openError) {
        console.warn(`[IMAP] Failed to open folder "${targetFolder}", trying to find a match...`);
        const mailboxes = await client.list();
        
        // Helper to find a mailbox by fuzzy name
        const findMailbox = (name: string) => {
          const lowerName = name.toLowerCase();
          return mailboxes.find(m => 
            m.path.toLowerCase() === lowerName || 
            m.name.toLowerCase() === lowerName ||
            m.path.toLowerCase().includes(lowerName)
          );
        };

        let match = null;
        if (folder.toUpperCase() === 'SENT') match = findMailbox('sent');
        else if (folder.toUpperCase() === 'DRAFTS') match = findMailbox('drafts');
        else if (folder.toUpperCase() === 'TRASH' || folder.toUpperCase() === 'DELETED') match = findMailbox('trash') || findMailbox('deleted');
        else if (folder.toUpperCase() === 'SPAM' || folder.toUpperCase() === 'JUNK') match = findMailbox('spam') || findMailbox('junk');
        
        if (match) {
          targetFolder = match.path;
          console.log(`[IMAP] Found matching folder: ${targetFolder}`);
          await client.mailboxOpen(targetFolder);
        } else {
          // Fallback to INBOX if nothing found and it's not a standard folder
          console.warn(`[IMAP] No match found for "${folder}", falling back to INBOX`);
          targetFolder = 'INBOX';
          await client.mailboxOpen(targetFolder);
        }
      }

      const lock = await client.getMailboxLock(targetFolder);
      
      const messages = [];
      try {
        // Fetch last 'limit' messages using sequence range
        const status = await client.status(targetFolder, { messages: true });
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
                snippet: "", // Snippet will be empty until body is fetched
                body: "",    // Body will be fetched on demand
                isRead: msg.flags ? msg.flags.has("\\Seen") : false,
                attachments: [] // Attachments will be fetched on demand
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
      console.error("IMAP Error:", error);
      res.status(500).json({ error: `IMAP Error: ${error.message}` });
    }
  });

  // API: Fetch Single Message Body (IMAP Proxy)
  app.post("/api/fetch-message-body", async (req, res) => {
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
          const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
          client.setCredentials({ refresh_token: refreshToken });
          const { token } = await client.getAccessToken();
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
      console.log(`[IMAP] Connected for body fetch. User: ${imapConfig.user}, Folder: ${folder}, UID: ${uid}`);
      
      // MUST open mailbox before getting lock
      await client.mailboxOpen(folder);
      const lock = await client.getMailboxLock(folder);
      
      let messageData = null;
      try {
        // Ensure UID is a string and valid
        const uidStr = uid.toString();
        const msg = await client.fetchOne(uidStr, { source: true }, { uid: true });
        
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
        } else {
          console.warn(`[IMAP] Message UID ${uidStr} not found in folder ${folder}`);
        }
      } catch (fetchError: any) {
        console.error(`[IMAP] fetchOne failed for UID ${uid}:`, fetchError.message);
        throw fetchError;
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
      console.error("IMAP Body Fetch Error:", error.message);
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
            const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
            client.setCredentials({ refresh_token: refreshToken });
            const { token } = await client.getAccessToken();
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
