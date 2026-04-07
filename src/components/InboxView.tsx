import React, { useState, useEffect } from 'react';
import { Mail, Star, Paperclip, Clock, ChevronRight, Inbox, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { EmailAccount, EmailMessage } from '../types';
import { cn } from '../lib/utils';
import { summarizeEmail } from '../services/geminiService';

interface Props {
  accountId: string | 'all';
  folder: string;
  searchQuery: string;
  accounts: EmailAccount[];
}

export default function InboxView({ accountId, folder, searchQuery, accounts }: Props) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [accountId, folder]);

  useEffect(() => {
    setSummary(null);
  }, [selectedMessage]);

  const handleSummarize = async () => {
    if (!selectedMessage) return;
    setIsSummarizing(true);
    const text = await summarizeEmail(selectedMessage.subject, selectedMessage.body);
    setSummary(text || "Could not generate summary.");
    setIsSummarizing(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // In a real app, we'd fetch from multiple accounts if accountId === 'all'
      // For this demo, we'll fetch from the first account or a mock if none
      const targetAccounts = accountId === 'all' ? accounts : accounts.filter(a => a.id === accountId);
      
      if (targetAccounts.length === 0) {
        setMessages([]);
        return;
      }

      // We'll just fetch from the first one for the demo to keep it simple
      const acc = targetAccounts[0];
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
          folder: folder.toUpperCase(),
          limit: 20
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages.map((m: any) => ({ ...m, accountId: acc.id })));
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.from.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Message List */}
      <div className={cn(
        "flex-1 flex flex-col border-r border-slate-800 bg-slate-900/30 transition-all",
        selectedMessage ? "hidden lg:flex lg:w-96 lg:flex-none" : "flex"
      )}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg capitalize">{folder}</h2>
          <span className="text-xs text-slate-500 font-medium bg-slate-800 px-2 py-1 rounded-full">
            {filteredMessages.length} Messages
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <RefreshCw className="animate-spin" size={24} />
              <p className="text-sm">Fetching your mail...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 p-8 text-center">
              <Inbox size={48} className="opacity-20" />
              <div>
                <p className="font-medium text-slate-300">No messages found</p>
                <p className="text-sm">Your {folder} is empty.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {filteredMessages.map(msg => (
                <button 
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-slate-800/50 transition-all group relative",
                    selectedMessage?.id === msg.id && "bg-blue-600/10 border-l-2 border-blue-500",
                    !msg.isRead && "bg-slate-800/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-sm font-semibold truncate flex-1", !msg.isRead ? "text-white" : "text-slate-300")}>
                      {msg.from}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                      {format(new Date(msg.date), 'MMM d')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs truncate mb-1", !msg.isRead ? "text-slate-200 font-medium" : "text-slate-400")}>
                      {msg.subject}
                    </p>
                    {msg.accountId && (
                      <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: accounts.find(a => a.id === msg.accountId)?.color }} 
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {msg.snippet}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className={cn(
        "flex-1 bg-slate-950 flex flex-col min-w-0",
        !selectedMessage && "hidden lg:flex items-center justify-center text-slate-600"
      )}>
        {selectedMessage ? (
          <>
            <header className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedMessage(null)} className="lg:hidden text-slate-400 hover:text-white">
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">From:</span>
                    <span className="text-blue-400 font-medium">{selectedMessage.from}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all text-sm font-medium"
                >
                  <Sparkles size={16} className={cn(isSummarizing && "animate-pulse")} />
                  {isSummarizing ? "Summarizing..." : "Summarize"}
                </button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  <Star size={18} />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <AnimatePresence>
                  {summary && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles size={14} />
                        AI Summary
                      </div>
                      <p className="text-sm text-slate-300 italic leading-relaxed">
                        "{summary}"
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between mb-8 text-xs text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-4">
                  <span>Received {format(new Date(selectedMessage.date), 'MMMM do, yyyy @ h:mm a')}</span>
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} />
                    <span>No Attachments</span>
                  </div>
                </div>
                <div 
                  className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
              <Mail size={32} className="text-slate-700" />
            </div>
            <p className="text-lg font-medium text-slate-500">Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
}
