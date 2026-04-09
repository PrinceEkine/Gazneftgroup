import React, { useState, useEffect } from 'react';
import { Mail, Star, Paperclip, Clock, ChevronRight, Inbox, Trash2, RefreshCw, Sparkles, AlertCircle, ArrowDown, Send, FileText, MailOpen, X, Sun, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { EmailAccount, EmailMessage, EmailDraft } from '../types';
import { cn } from '../lib/utils';
import { summarizeEmail, detectPriority, generateSmartReplies } from '../services/geminiService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Props {
  accountId: string | 'all';
  folder: string;
  searchQuery: string;
  accounts: EmailAccount[];
  onOpenDraft?: (draft: EmailDraft) => void;
}

export default function InboxView({ accountId, folder, searchQuery, accounts, onOpenDraft }: Props) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [firestoreDrafts, setFirestoreDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [isUpdatingFlags, setIsUpdatingFlags] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [accountId, folder]);

  // Fetch Firestore drafts
  useEffect(() => {
    if (!auth.currentUser || folder !== 'drafts') {
      setFirestoreDrafts([]);
      return;
    }

    const draftsRef = collection(db, 'users', auth.currentUser.uid, 'drafts');
    const q = accountId === 'all' 
      ? query(draftsRef)
      : query(draftsRef, where('accountId', '==', accountId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailDraft));
      setFirestoreDrafts(drafts);
    });

    return unsubscribe;
  }, [accountId, folder]);

  useEffect(() => {
    setSummary(null);
    setSmartReplies([]);
    if (selectedMessage) {
      // If body is empty, fetch it
      if (!selectedMessage.body) {
        fetchMessageBody(selectedMessage);
      } else {
        handleGenerateReplies();
      }
      
      // Automatically mark as read if it's currently unread
      if (!selectedMessage.isRead) {
        toggleReadStatus(selectedMessage);
      }
    }
  }, [selectedMessage]);

  const fetchMessageBody = async (msg: EmailMessage) => {
    const acc = accounts.find(a => a.id === msg.accountId);
    if (!acc) return;

    // Map folder names to common IMAP paths (same logic as fetchMessages)
    let imapFolder = folder.toUpperCase();
    if (acc.provider === 'gmail') {
      if (folder === 'sent') imapFolder = '[Gmail]/Sent Mail';
      else if (folder === 'drafts') imapFolder = '[Gmail]/Drafts';
      else if (folder === 'trash') imapFolder = '[Gmail]/Trash';
      else if (folder === 'spam') imapFolder = '[Gmail]/Spam';
    } else if (acc.provider === 'outlook') {
      if (folder === 'sent') imapFolder = 'Sent';
      else if (folder === 'drafts') imapFolder = 'Drafts';
      else if (folder === 'trash') imapFolder = 'Deleted';
      else if (folder === 'spam') imapFolder = 'Junk';
    }

    try {
      const response = await fetch('/api/fetch-message-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imapConfig: {
            host: acc.imapHost,
            port: acc.imapPort,
            user: acc.email,
            pass: acc.password
          },
          uid: msg.id.substring(msg.id.indexOf('-') + 1), // Robust UID extraction
          folder: imapFolder,
          authType: acc.authType,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken
        })
      });

      const data = await response.json();
      if (data.success) {
        const updatedMsg = { 
          ...msg, 
          body: data.body, 
          snippet: data.snippet, 
          attachments: data.attachments 
        };
        
        // Update in messages list
        setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
        
        // Update selected message if it's still the same one
        if (selectedMessage?.id === msg.id) {
          setSelectedMessage(updatedMsg);
        }
      }
    } catch (err) {
      console.error("Failed to fetch message body", err);
    }
  };

  const handleSummarize = async () => {
    if (!selectedMessage) return;
    setIsSummarizing(true);
    const text = await summarizeEmail(selectedMessage.subject, selectedMessage.body);
    setSummary(text || "Could not generate summary.");
    setIsSummarizing(false);
  };

  const handleGenerateReplies = async () => {
    if (!selectedMessage) return;
    setIsGeneratingReplies(true);
    const replies = await generateSmartReplies(selectedMessage.subject, selectedMessage.body);
    setSmartReplies(replies);
    setIsGeneratingReplies(false);
  };

  const toggleReadStatus = async (msg: EmailMessage) => {
    if (isUpdatingFlags) return;
    
    const acc = accounts.find(a => a.id === msg.accountId);
    if (!acc) return;

    setIsUpdatingFlags(true);
    const newReadStatus = !msg.isRead;

    try {
      const response = await fetch('/api/update-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imapConfig: {
            host: acc.imapHost,
            port: acc.imapPort,
            user: acc.email,
            pass: acc.password
          },
          uid: msg.id, // In our types, id is msg.uid
          flags: ["\\Seen"],
          action: newReadStatus ? 'add' : 'remove',
          folder: folder.toUpperCase(),
          authType: acc.authType,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON. Ensure the backend is running.");
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        const updatedMessages = messages.map(m => 
          m.id === msg.id ? { ...m, isRead: newReadStatus } : m
        );
        setMessages(updatedMessages);
        
        if (selectedMessage?.id === msg.id) {
          setSelectedMessage({ ...selectedMessage, isRead: newReadStatus });
        }
      }
    } catch (error) {
      console.error("Failed to update read status", error);
    } finally {
      setIsUpdatingFlags(false);
    }
  };

  const handleSnooze = async (msgId: string, duration: string) => {
    // In a real app, we'd save this to Firestore or move to a Snoozed folder
    // For this demo, we'll update the local state with a snoozedUntil date
    const now = new Date();
    let snoozedUntil = new Date();
    
    if (duration === 'Later today') snoozedUntil.setHours(18, 0, 0, 0);
    else if (duration === 'Tomorrow') snoozedUntil.setDate(now.getDate() + 1);
    else if (duration === 'This weekend') {
      const day = now.getDay();
      const diff = (day === 0 ? 6 : 6 - day); // Saturday
      snoozedUntil.setDate(now.getDate() + diff);
      snoozedUntil.setHours(10, 0, 0, 0);
    }
    else if (duration === 'Next week') {
      const day = now.getDay();
      const diff = (day === 0 ? 1 : 8 - day); // Monday
      snoozedUntil.setDate(now.getDate() + diff);
      snoozedUntil.setHours(8, 0, 0, 0);
    }

    setMessages(prev => prev.map(m => 
      m.id === msgId ? { ...m, snoozedUntil: snoozedUntil.toISOString() } : m
    ));

    if (selectedMessage?.id === msgId) {
      setSelectedMessage(null);
    }
    setShowSnoozeModal(null);
  };

  const fetchMessages = async () => {
    if (folder === 'snoozed') {
      if (messages.length > 0) {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const targetAccounts = accountId === 'all' ? accounts : accounts.filter(a => a.id === accountId);
      
      if (targetAccounts.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const fetchFromAccount = async (acc: any) => {
        // Map folder names to common IMAP paths
        let imapFolder = folder.toUpperCase();
        if (acc.provider === 'gmail') {
          if (folder === 'sent') imapFolder = '[Gmail]/Sent Mail';
          else if (folder === 'drafts') imapFolder = '[Gmail]/Drafts';
          else if (folder === 'trash') imapFolder = '[Gmail]/Trash';
          else if (folder === 'spam') imapFolder = '[Gmail]/Spam';
        } else if (acc.provider === 'outlook') {
          if (folder === 'sent') imapFolder = 'Sent';
          else if (folder === 'drafts') imapFolder = 'Drafts';
          else if (folder === 'trash') imapFolder = 'Deleted';
          else if (folder === 'spam') imapFolder = 'Junk';
        }

        // If snoozed, we actually want to fetch INBOX and then filter locally
        if (folder === 'snoozed') imapFolder = 'INBOX';

        try {
          const response = await fetch('/api/fetch-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imapConfig: {
                host: acc.imapHost,
                port: acc.imapPort,
                user: acc.email,
                pass: acc.password
              },
              authType: acc.authType,
              accessToken: acc.accessToken,
              refreshToken: acc.refreshToken,
              folder: imapFolder,
              limit: 20
            })
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            return { success: false, error: "Server returned HTML instead of JSON" };
          }

          const data = await response.json();
          if (data.success) {
            return { 
              success: true, 
              messages: data.messages.map((m: any) => ({ 
                ...m, 
                id: `${acc.id}-${m.uid}`, // Ensure unique IDs across accounts
                accountId: acc.id 
              }))
            };
          } else {
            return { success: false, error: data.error || "Failed to fetch messages" };
          }
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      };

      const results = await Promise.all(targetAccounts.map(fetchFromAccount));
      
      const allMessages: EmailMessage[] = [];
      const errors: string[] = [];

      results.forEach((res, idx) => {
        if (res.success) {
          allMessages.push(...res.messages);
        } else {
          console.error(`Failed to fetch from ${targetAccounts[idx].email}:`, res.error);
          errors.push(`${targetAccounts[idx].email}: ${res.error}`);
        }
      });

      if (allMessages.length === 0 && errors.length > 0) {
        setError(`Failed to fetch messages: ${errors.join(', ')}`);
      } else {
        // Sort all messages by date descending
        const sortedMessages = allMessages.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setMessages(sortedMessages);
        setLoading(false); // Stop loading early

        // Background: Fetch priorities for the first 5 messages
        (async () => {
          const prioritizedMessages = [...sortedMessages];
          for (let i = 0; i < Math.min(5, prioritizedMessages.length); i++) {
            const msg = prioritizedMessages[i];
            try {
              // We need the body for priority detection, so fetch it if empty
              let body = msg.body;
              if (!body) {
                const acc = accounts.find(a => a.id === msg.accountId);
                if (acc) {
                  // Map folder names to common IMAP paths
                  let imapFolder = folder.toUpperCase();
                  if (acc.provider === 'gmail') {
                    if (folder === 'sent') imapFolder = '[Gmail]/Sent Mail';
                    else if (folder === 'drafts') imapFolder = '[Gmail]/Drafts';
                    else if (folder === 'trash') imapFolder = '[Gmail]/Trash';
                    else if (folder === 'spam') imapFolder = '[Gmail]/Spam';
                  } else if (acc.provider === 'outlook') {
                    if (folder === 'sent') imapFolder = 'Sent';
                    else if (folder === 'drafts') imapFolder = 'Drafts';
                    else if (folder === 'trash') imapFolder = 'Deleted';
                    else if (folder === 'spam') imapFolder = 'Junk';
                  }

                  const resp = await fetch('/api/fetch-message-body', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      imapConfig: { host: acc.imapHost, port: acc.imapPort, user: acc.email, pass: acc.password },
                      uid: msg.id.substring(msg.id.indexOf('-') + 1),
                      folder: imapFolder,
                      authType: acc.authType,
                      accessToken: acc.accessToken,
                      refreshToken: acc.refreshToken
                    })
                  });
                  const data = await resp.json();
                  if (data.success) body = data.body;
                }
              }

              const priority = await detectPriority(msg.subject, body || "");
              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, priority, body: body || m.body } : m));
              
              // Small delay between requests
              if (i < 4) await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
              console.warn(`Background priority detection failed for ${msg.id}:`, err);
            }
          }
        })();

        if (errors.length > 0) {
          console.warn("Some accounts failed to fetch:", errors);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch messages", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.from.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isSnoozed = m.snoozedUntil && new Date(m.snoozedUntil) > new Date();
    
    if (folder === 'snoozed') {
      return matchesSearch && isSnoozed;
    }
    
    // If in inbox, hide snoozed messages
    if (folder === 'inbox') {
      return matchesSearch && !isSnoozed;
    }

    return matchesSearch;
  });

  const allDisplayMessages = [
    ...filteredMessages,
    ...(folder === 'drafts' ? firestoreDrafts.map(d => ({
      id: d.id,
      accountId: d.accountId,
      subject: d.subject || '(No Subject)',
      from: 'Draft',
      to: d.to,
      date: d.updatedAt,
      snippet: d.body.replace(/<[^>]*>/g, '').substring(0, 100),
      body: d.body,
      isRead: true,
      folder: 'drafts' as const,
      isFirestoreDraft: true,
      draftData: d
    })) : [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex h-full overflow-hidden">
      {/* Message List */}
      <div className={cn(
        "flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 transition-all",
        selectedMessage ? "hidden lg:flex lg:w-96 lg:flex-none" : "flex"
      )}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg capitalize text-slate-900 dark:text-white">{folder}</h2>
            <button 
              onClick={() => {
                const unread = allDisplayMessages.filter(m => !m.isRead);
                unread.forEach(m => toggleReadStatus(m as any));
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
          </div>
          <span className="text-xs text-slate-500 font-medium bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
            {allDisplayMessages.length} Messages
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && allDisplayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <RefreshCw className="animate-spin" size={24} />
              <p className="text-sm">Fetching your mail...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-red-500 p-8 text-center">
              <AlertCircle size={48} className="opacity-20" />
              <div>
                <p className="font-medium text-red-400">Error fetching messages</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
              <button 
                onClick={fetchMessages}
                className="mt-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Try Again
              </button>
            </div>
          ) : allDisplayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 p-8 text-center">
              <Inbox size={48} className="opacity-20" />
              <div>
                <p className="font-medium text-slate-300">No messages found</p>
                <p className="text-sm">Your {folder} is empty.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {allDisplayMessages.map((msg: any) => (
                <div 
                  key={msg.id}
                  onClick={() => {
                    if (msg.isFirestoreDraft && onOpenDraft) {
                      onOpenDraft(msg.draftData);
                    } else {
                      setSelectedMessage(msg);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (msg.isFirestoreDraft && onOpenDraft) {
                        onOpenDraft(msg.draftData);
                      } else {
                        setSelectedMessage(msg);
                      }
                    }
                  }}
                  className={cn(
                    "w-full text-left p-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all group relative cursor-pointer outline-none focus:bg-slate-200/70 dark:focus:bg-slate-800/70",
                    selectedMessage?.id === msg.id && "bg-blue-600/10 border-l-2 border-blue-500",
                    !msg.isRead && "bg-blue-50/50 dark:bg-slate-800/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 truncate flex-1">
                      {!msg.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-none shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                      <span className={cn("text-sm truncate transition-colors", !msg.isRead ? "text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400 font-medium")}>
                        {msg.from}
                      </span>
                      {msg.isFirestoreDraft && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Local Draft</span>
                      )}
                    </div>
                    <span className={cn("text-[10px] whitespace-nowrap ml-2 transition-colors", !msg.isRead ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500")}>
                      {format(new Date(msg.date), 'MMM d')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs truncate mb-1 flex-1 transition-colors", !msg.isRead ? "text-slate-800 dark:text-slate-100 font-semibold" : "text-slate-500")}>
                      {msg.subject}
                    </p>
                    <div className="flex items-center gap-1 flex-none">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReadStatus(msg);
                        }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                        title={msg.isRead ? "Mark as unread" : "Mark as read"}
                      >
                        {msg.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSnoozeModal(msg.id);
                        }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Snooze"
                      >
                        <Clock size={14} />
                      </button>
                      {msg.priority === 'urgent' && <AlertCircle size={12} className="text-red-500" />}
                      {msg.priority === 'low' && <ArrowDown size={12} className="text-slate-500" />}
                      {msg.attachments && msg.attachments.length > 0 && <Paperclip size={12} className="text-slate-500" />}
                      {msg.accountId && (
                        <div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: accounts.find(a => a.id === msg.accountId)?.color }} 
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2 leading-relaxed">
                    {msg.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className={cn(
        "flex-1 bg-white dark:bg-slate-950 flex flex-col min-w-0",
        !selectedMessage && "hidden lg:flex items-center justify-center text-slate-400 dark:text-slate-600"
      )}>
        {selectedMessage ? (
          <>
            <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedMessage(null)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">From:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{selectedMessage.from}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all text-sm font-medium"
                >
                  <Sparkles size={16} className={cn(isSummarizing && "animate-pulse")} />
                  {isSummarizing ? "Summarizing..." : "Summarize"}
                </button>
                <button 
                  onClick={() => toggleReadStatus(selectedMessage)}
                  disabled={isUpdatingFlags}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title={selectedMessage.isRead ? "Mark as unread" : "Mark as read"}
                >
                  {selectedMessage.isRead ? <Mail size={18} /> : <MailOpen size={18} />}
                </button>
                <button 
                  onClick={() => setShowSnoozeModal(selectedMessage.id)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Snooze"
                >
                  <Clock size={18} />
                </button>
                <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                  <Star size={18} />
                </button>
                <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 max-w-4xl mx-auto">
                <AnimatePresence>
                  {summary && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles size={14} />
                        AI Summary
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{summary}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between mb-8 text-xs text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-4">
                  <span>Received {format(new Date(selectedMessage.date), 'MMMM do, yyyy @ h:mm a')}</span>
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} />
                    <span>{selectedMessage.attachments?.length || 0} Attachments</span>
                  </div>
                </div>

                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMessage.attachments.map((att, i) => (
                      <a 
                        key={i}
                        href={att.url}
                        download={att.filename}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{att.filename}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <ArrowDown size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                      </a>
                    ))}
                  </div>
                )}

                <div 
                  className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed mb-12 overflow-x-auto custom-scrollbar"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                />

                <AnimatePresence>
                  {smartReplies.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800 pt-8"
                    >
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                        <Sparkles size={14} />
                        Smart Replies
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {smartReplies.map((reply, i) => (
                          <button 
                            key={i}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-700 rounded-full text-sm transition-all text-slate-700 dark:text-slate-300"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {isGeneratingReplies && (
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider animate-pulse">
                        <Sparkles size={14} />
                        Generating suggestions...
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
              <Mail size={32} className="text-slate-400 dark:text-slate-700" />
            </div>
            <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Select a message to read</p>
          </div>
        )}
      </div>

      {/* Snooze Modal */}
      <AnimatePresence>
        {showSnoozeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={16} className="text-yellow-600 dark:text-yellow-500" />
                  Snooze until...
                </h3>
                <button onClick={() => setShowSnoozeModal(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-2">
                {[
                  { label: 'Later today', time: '6:00 PM', icon: <Sun size={14} /> },
                  { label: 'Tomorrow', time: '8:00 AM', icon: <ArrowRight size={14} /> },
                  { label: 'This weekend', time: 'Sat 10:00 AM', icon: <Star size={14} /> },
                  { label: 'Next week', time: 'Mon 8:00 AM', icon: <ChevronRight size={14} /> },
                ].map((option, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSnooze(showSnoozeModal, option.label)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400 dark:text-slate-500 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                        {option.icon}
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{option.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-bold">{option.time}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
