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
  password?: string; // Only stored locally/session if needed, but for this demo we'll assume it's stored in Firestore (encrypted in real world)
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
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
