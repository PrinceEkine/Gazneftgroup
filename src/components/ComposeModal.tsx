import React, { useState, useRef } from 'react';
import { X, Send, Paperclip, Image, Smile, MoreHorizontal, Trash2, ChevronDown, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailAccount } from '../types';
import { cn } from '../lib/utils';

interface Props {
  accounts: EmailAccount[];
  onClose: () => void;
  user: any;
}

interface Attachment {
  file: File;
  base64: string;
}

export default function ComposeModal({ accounts, onClose, user }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments(prev => [...prev, { file, base64: base64.split(',')[1] }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsSending(true);
    setStatus(null);

    const recipients = to.split(',').map(r => r.trim()).filter(r => r.length > 0);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: {
            host: selectedAccount.smtpHost,
            port: selectedAccount.smtpPort,
            user: selectedAccount.email,
            pass: selectedAccount.password
          },
          mailOptions: {
            from: `"${selectedAccount.label}" <${selectedAccount.email}>`,
            to: recipients.join(', '),
            subject,
            html: body.replace(/\n/g, '<br>'),
            attachments: attachments.map(att => ({
              filename: att.file.name,
              content: att.base64,
              encoding: 'base64'
            }))
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setStatus({ type: 'success', message: `Message sent successfully to ${recipients.length} recipient(s)!` });
        setTimeout(onClose, 2000);
      } else {
        setStatus({ type: 'error', message: data.error || "Failed to send message" });
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl h-[90vh] sm:h-auto"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 rounded-t-2xl">
          <h2 className="font-bold text-white">New Message</h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-12">From</span>
              <div className="relative flex-1">
                <select 
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.label} ({acc.email})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-12">To</span>
              <input 
                type="text" 
                placeholder="recipients@example.com (separate with commas)"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-600 focus:ring-0"
                required
              />
            </div>
            <div className="flex items-center gap-4 border-t border-slate-800/50 pt-4">
              <span className="text-sm text-slate-500 w-12">Subject</span>
              <input 
                type="text" 
                placeholder="What's this about?"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-600 focus:ring-0"
                required
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <textarea 
              placeholder="Write your message here..."
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full h-full bg-transparent border-none text-sm text-slate-200 placeholder:text-slate-700 focus:ring-0 resize-none min-h-[200px]"
              required
            />

            <AnimatePresence>
              {attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg group"
                    >
                      <FileText size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-300 truncate max-w-[150px]">{att.file.name}</span>
                      <button 
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-slate-500 hover:text-red-400 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/30">
            <div className="flex items-center gap-1">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                multiple 
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <Paperclip size={20} />
              </button>
              <button type="button" className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <Image size={20} />
              </button>
              <button type="button" className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <Smile size={20} />
              </button>
              <button type="button" className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={20} />
              </button>
              <button 
                type="submit"
                disabled={isSending}
                className={cn(
                  "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20",
                  isSending && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSending ? "Sending..." : "Send"}
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>

        {status && (
          <div className={cn(
            "p-4 text-center text-sm font-medium",
            status.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}>
            {status.message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
