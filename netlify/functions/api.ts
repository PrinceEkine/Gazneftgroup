import express from "express";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

// API: Send Email (SMTP Proxy)
app.post("/api/send-email", async (req, res) => {
  const { smtpConfig, mailOptions } = req.body;
  if (!smtpConfig || !mailOptions) return res.status(400).json({ error: "Missing config" });

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    });
    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Fetch Emails (IMAP Proxy)
app.post("/api/fetch-emails", async (req, res) => {
  const { imapConfig, folder = "INBOX", limit = 20 } = req.body;
  if (!imapConfig) return res.status(400).json({ error: "Missing config" });

  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.port === 993,
    auth: { user: imapConfig.user, pass: imapConfig.pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    const messages = [];
    try {
      const status = await client.status(folder, { messages: true });
      const totalMessages = status.messages || 0;
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
          isRead: msg.flags.has("\\Seen"),
          attachments: parsed.attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            contentId: att.contentId,
            url: `data:${att.contentType};base64,${att.content.toString('base64')}`
          }))
        });
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

// API: Test Connection
app.post("/api/test-connection", async (req, res) => {
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

export const handler = serverless(app);
