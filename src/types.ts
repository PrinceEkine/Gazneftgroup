export interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'custom';
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
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
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
}
