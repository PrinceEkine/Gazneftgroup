import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Paperclip, Image, Smile, MoreHorizontal, Trash2, ChevronDown, FileText, Save, Loader2, Mail, ShieldCheck, AlertTriangle, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailAccount, EmailTemplate, EmailDraft } from '../types';
import { cn } from '../lib/utils';
import { collection, addDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import TemplateSelector from './TemplateSelector';
import { GoogleGenAI } from "@google/genai";

interface Props {
  accounts: EmailAccount[];
  onClose: () => void;
  user: any;
  initialDraft?: EmailDraft;
}

interface Attachment {
  file: File;
  base64: string;
}

interface DeliverabilityAnalysis {
  score: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestions: string[];
  spammyWordsFound: string[];
}

export default function ComposeModal({ accounts, onClose, user, initialDraft }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialDraft?.accountId || accounts[0]?.id || '');
  const [to, setTo] = useState(initialDraft?.to || '');
  const [toInput, setToInput] = useState('');
  const [replyTo, setReplyTo] = useState(initialDraft?.replyTo || '');
  const [subject, setSubject] = useState(initialDraft?.subject || '');
  const [body, setBody] = useState(initialDraft?.body || '');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DeliverabilityAnalysis | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id || null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Auto-save draft logic
  useEffect(() => {
    if (!user || (!to && !subject && !body)) return;

    const saveDraft = async () => {
      setSaveStatus('saving');
      try {
        const draftData = {
          accountId: selectedAccountId,
          to,
          replyTo,
          subject,
          body,
          updatedAt: new Date().toISOString(),
          userId: user.uid,
          type: 'draft'
        };

        if (draftId) {
          await setDoc(doc(db, 'users', user.uid, 'drafts', draftId), draftData, { merge: true });
        } else {
          const docRef = await addDoc(collection(db, 'users', user.uid, 'drafts'), {
            ...draftData,
            createdAt: new Date().toISOString()
          });
          setDraftId(docRef.id);
        }
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving draft:", error);
        setSaveStatus('error');
      }
    };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveDraft, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [to, subject, body, replyTo, selectedAccountId, user, draftId]);

  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      editorRef.current.innerHTML = body;
    }
  }, [isHtmlMode]);

  const handleEditorChange = () => {
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleEditorChange();
    editorRef.current?.focus();
  };

  const handleDeliverabilityCheck = async () => {
    if (!subject || !body) {
      setStatus({ type: 'error', message: "Subject and body are required for analysis." });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Analyze the following email for deliverability and spam risk. 
        Provide a score from 0 to 100 (where 100 is perfectly safe) and specific suggestions to improve it.
        Focus on:
        - Spammy keywords (e.g., "urgent", "free", "winner", "guaranteed")
        - Excessive capitalization or punctuation
        - Suspicious links or formatting
        - Overall tone and professionality

        Subject: ${subject}
        Body (HTML): ${body}

        Return the result in JSON format:
        {
          "score": number,
          "riskLevel": "Low" | "Medium" | "High",
          "suggestions": string[],
          "spammyWordsFound": string[]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const data = JSON.parse(text);
      setAnalysis(data);
    } catch (error: any) {
      setStatus({ type: 'error', message: "Analysis failed: " + error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
    const largeFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
    
    if (largeFiles.length > 0) {
      setStatus({ 
        type: 'error', 
        message: `Some files are too large (max 30MB): ${largeFiles.map(f => f.name).join(', ')}` 
      });
      return;
    }

    const BLOCKED_EXTENSIONS = [
      '.ade', '.adp', '.apk', '.appx', '.appxbundle', '.bat', '.cab', '.chm', '.cmd', '.com', '.cpl', 
      '.dll', '.dmg', '.ex', '.ex_', '.exe', '.hta', '.ins', '.isp', '.iso', '.jar', '.js', '.jse', 
      '.lib', '.lnk', '.mde', '.msc', '.msi', '.msix', '.msixbundle', '.msp', '.mst', '.nsh', '.pif', 
      '.ps1', '.scr', '.sct', '.shb', '.sys', '.vb', '.vbe', '.vbs', '.vxd', '.wsc', '.wsf', '.wsh'
    ];

    const restrictedFiles = Array.from(files).filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      return BLOCKED_EXTENSIONS.includes(ext);
    });

    if (restrictedFiles.length > 0) {
      setStatus({ 
        type: 'error', 
        message: `Security Warning: Some files are blocked by email providers (e.g. ${restrictedFiles.map(f => f.name).join(', ')}). These will likely cause the email to be rejected. Please remove them or share via a link.` 
      });
      // We don't return here, we let them try if they want, but we show the warning
    }

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

  const handleSaveTemplate = async () => {
    if (!subject || !body) {
      setStatus({ type: 'error', message: "Subject and body are required to save a template." });
      return;
    }

    const templateName = prompt("Enter a name for this template:", subject);
    if (!templateName) return;

    setIsSavingTemplate(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'templates'), {
        name: templateName,
        subject,
        body,
        replyTo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: "Template saved successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus({ type: 'error', message: "Failed to save template: " + error.message });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setBody(template.body);
    setReplyTo(template.replyTo || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = template.body;
    }
    setShowTemplateSelector(false);
  };

  const recipients = useMemo(() => to.split(',').map(r => r.trim()).filter(r => r.length > 0), [to]);

  const addRecipient = (email: string) => {
    const trimmed = email.trim().replace(/,$/, '');
    if (trimmed && !recipients.includes(trimmed)) {
      setTo(prev => prev ? `${prev}, ${trimmed}` : trimmed);
    }
    setToInput('');
  };

  const removeRecipient = (email: string) => {
    const newRecipients = recipients.filter(r => r !== email);
    setTo(newRecipients.join(', '));
  };

  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(toInput);
    } else if (e.key === 'Backspace' && !toInput && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Auto-add current input if it looks like an email
    let currentTo = to;
    if (toInput.trim()) {
      const trimmed = toInput.trim().replace(/,$/, '');
      if (trimmed && !recipients.includes(trimmed)) {
        currentTo = to ? `${to}, ${trimmed}` : trimmed;
        setTo(currentTo);
        setToInput('');
      }
    }

    if (!selectedAccount) {
      setStatus({ type: 'error', message: "Please select an account to send from." });
      return;
    }

    const finalRecipients = currentTo.split(',').map(r => r.trim()).filter(r => r.length > 0);
    if (finalRecipients.length === 0) {
      setStatus({ type: 'error', message: "Please add at least one recipient." });
      return;
    }

    if (!subject.trim()) {
      setStatus({ type: 'error', message: "Please enter a subject." });
      return;
    }

    if (!body.trim() || body === '<br>') {
      setStatus({ type: 'error', message: "Please enter a message body." });
      return;
    }

    setIsSending(true);
    setStatus(null);

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
          authType: selectedAccount.authType,
          accessToken: selectedAccount.accessToken,
          refreshToken: selectedAccount.refreshToken,
          mailOptions: {
            from: `"${selectedAccount.label}" <${selectedAccount.email}>`,
            to: finalRecipients.join(', '),
            replyTo: replyTo || undefined,
            subject,
            html: body,
            attachments: attachments.map(att => ({
              filename: att.file.name,
              content: att.base64,
              encoding: 'base64',
              contentType: att.file.type
            }))
          }
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        if (response.status === 413) {
          throw new Error("File too large. The platform (AI Studio or Netlify) has a limit on attachment size (usually 10-20MB). Please share larger files via a link.");
        }
        throw new Error(`Server error (${response.status}). Ensure the backend is running.`);
      }

      const data = await response.json();
      if (data.success) {
        // Delete draft if it exists
        if (draftId) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'drafts', draftId));
          } catch (err) {
            console.error("Failed to delete draft after sending:", err);
          }
        }
        
        setStatus({ type: 'success', message: `Message sent successfully to ${finalRecipients.length} recipient(s)!` });
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

  const handleDiscard = async () => {
    if (draftId) {
      if (confirm("Are you sure you want to discard this draft?")) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'drafts', draftId));
          onClose();
        } catch (err) {
          console.error("Failed to delete draft:", err);
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl h-[95vh] sm:h-[85vh] max-h-[95vh] sm:max-h-[85vh] overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl flex-none">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900 dark:text-white">New Message</h2>
            <AnimatePresence>
              {saveStatus !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 size={10} className="animate-spin text-blue-500" />
                  ) : saveStatus === 'saved' ? (
                    <CheckCircle2 size={10} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={10} className="text-red-500" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Draft Saved' : 'Save Error'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          {accounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 overflow-y-auto">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Email Accounts</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  You need to add an email account before you can compose or send messages.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  onClose();
                  // We'll trigger account manager from App.tsx or just tell them to use the settings icon
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-all"
              >
                Go to Settings
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 space-y-4 border-b border-slate-200 dark:border-slate-800 flex-none">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-12">From</span>
                  <div className="relative flex-1">
                    <select 
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-white dark:bg-slate-900">{acc.label} ({acc.email})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-sm text-slate-500 w-12 pt-2">To</span>
                  <div className="flex-1 flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[40px]">
                    {recipients.map(email => (
                      <span 
                        key={email} 
                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-md transition-all animate-in fade-in zoom-in duration-200"
                      >
                        {email}
                        <button 
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      placeholder={recipients.length === 0 ? "recipients@example.com" : ""}
                      value={toInput}
                      onChange={e => setToInput(e.target.value)}
                      onKeyDown={handleToKeyDown}
                      onBlur={() => addRecipient(toInput)}
                      className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0 min-w-[120px] p-0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                  <span className="text-sm text-slate-500 w-12">Reply-To</span>
                  <input 
                    type="email" 
                    placeholder="alternative-reply@example.com (optional)"
                    value={replyTo}
                    onChange={e => setReplyTo(e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                  <span className="text-sm text-slate-500 w-12">Subject</span>
                  <input 
                    type="text" 
                    placeholder="What's this about?"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0"
                  />
                </div>
              </div>

              {/* Rich Text Toolbar */}
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 flex-wrap bg-slate-50 dark:bg-slate-950/20 flex-none">
                <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} title="Bold" />
                <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} title="Italic" />
                <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} title="Underline" />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                <ToolbarButton icon={<LinkIcon size={16} />} onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) execCommand('createLink', url);
                }} title="Insert Link" />
                <div className="flex-1" />
                <button 
                  type="button"
                  onClick={() => setIsHtmlMode(!isHtmlMode)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                    isHtmlMode ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Code size={14} />
                  {isHtmlMode ? "Visual" : "Source"}
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {isHtmlMode ? (
                  <textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="flex-1 w-full p-4 bg-transparent border-none text-sm font-mono text-blue-600 dark:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-0 resize-none overflow-y-auto custom-scrollbar"
                    placeholder="Enter HTML source code..."
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                    <div 
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorChange}
                      className="w-full h-full bg-transparent border-none text-sm text-slate-800 dark:text-slate-200 focus:outline-none prose prose-slate dark:prose-invert prose-sm max-w-none"
                    />
                  </div>
                )}

                <AnimatePresence>
                  {analysis && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mx-4 mb-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 flex-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className={cn(
                            analysis.riskLevel === 'Low' ? "text-green-500" : 
                            analysis.riskLevel === 'Medium' ? "text-yellow-500" : "text-red-500"
                          )} />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">Deliverability Score: {analysis.score}/100</span>
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          analysis.riskLevel === 'Low' ? "bg-green-500/10 text-green-600 dark:text-green-400" : 
                          analysis.riskLevel === 'Medium' ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                          {analysis.riskLevel} Risk
                        </span>
                      </div>

                      {analysis.spammyWordsFound.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold w-full mb-1">Spam Triggers:</span>
                          {analysis.spammyWordsFound.map(word => (
                            <span key={word} className="bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px]">{word}</span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Suggestions:</span>
                        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          {analysis.suggestions.map((s, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-blue-500">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {attachments.length > 0 && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2 flex-none">
                      {attachments.map((att, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group"
                        >
                          <FileText size={14} className="text-slate-400 dark:text-slate-500" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{att.file.name}</span>
                          <button 
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/30 flex-none">
                <div className="flex items-center gap-1 relative">
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
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Attach files"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDeliverabilityCheck}
                    disabled={isAnalyzing}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      analysis ? "bg-green-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                    )}
                    title="Check deliverability"
                  >
                    {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      showTemplateSelector ? "bg-blue-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                    )}
                    title="Use template"
                  >
                    <FileText size={20} />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all disabled:opacity-50",
                      "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                    )}
                    title="Save as template"
                  >
                    {isSavingTemplate ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span className="text-xs font-medium hidden md:inline">Save Template</span>
                  </button>

                  <AnimatePresence>
                    {showTemplateSelector && (
                      <TemplateSelector 
                        user={user} 
                        onSelect={handleSelectTemplate} 
                        onClose={() => setShowTemplateSelector(false)} 
                      />
                    )}
                  </AnimatePresence>

                  <button type="button" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all">
                    <Image size={20} />
                  </button>
                  <button type="button" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all">
                    <Smile size={20} />
                  </button>
                  <button type="button" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={handleDiscard}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    type="button"
                    disabled={isSending}
                    onClick={() => handleSend()}
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
            </>
          )}
        </form>

        <AnimatePresence>
          {status && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "p-4 text-center text-sm font-medium",
                status.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-all"
      title={title}
    >
      {icon}
    </button>
  );
}
