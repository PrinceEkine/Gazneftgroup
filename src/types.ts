export interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'gnmail' | 'custom';
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  label: string;
  color: string;
  password?: string;
  authType?: 'password' | 'oauth2';
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface EmailMessage {
  id: string;
  accountId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  // Standard ids ('inbox', 'sent', …) or a custom id ('imap:' + IMAP path).
  folder: string;
  snoozedUntil?: string;
  priority?: 'urgent' | 'normal' | 'low';
  smartReplies?: string[];
  attachments?: {
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
    url?: string;
  }[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  replyTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDraft {
  id: string;
  accountId: string;
  userId: string;
  to: string;
  replyTo?: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  type: 'draft';
  // A failed send marks the draft 'queued' (shown in Outbox) instead of
  // leaving the message unsent with nowhere to retry it from.
  status?: 'draft' | 'queued';
  sendError?: string;
}
