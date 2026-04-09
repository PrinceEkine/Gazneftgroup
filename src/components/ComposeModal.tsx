import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Image, Smile, MoreHorizontal, Trash2, ChevronDown, FileText, Save, Loader2, Mail, ShieldCheck, AlertTriangle, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailAccount, EmailTemplate } from '../types';
import { cn } from '../lib/utils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import TemplateSelector from './TemplateSelector';
import { GoogleGenAI } from "@google/genai";

interface Props {
  accounts: EmailAccount[];
  onClose: () => void;
  user: any;
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

export default function ComposeModal({ accounts, onClose, user }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [to, setTo] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DeliverabilityAnalysis | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

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
          authType: selectedAccount.authType,
          accessToken: selectedAccount.accessToken,
          refreshToken: selectedAccount.refreshToken,
          mailOptions: {
            from: `"${selectedAccount.label}" <${selectedAccount.email}>`,
            to: recipients.join(', '),
            replyTo: replyTo || undefined,
            subject,
            html: body,
            attachments: attachments.map(att => ({
              filename: att.file.name,
              content: att.base64,
              encoding: 'base64'
            }))
          }
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON. Ensure the backend is running.");
      }

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
          {accounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                <Mail size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No Email Accounts</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
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
              <div className="p-4 space-y-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-12">From</span>
                  <div className="relative flex-1">
                    <select 
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 px-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-slate-900">{acc.label} ({acc.email})</option>
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
                  <span className="text-sm text-slate-500 w-12">Reply-To</span>
                  <input 
                    type="email" 
                    placeholder="alternative-reply@example.com (optional)"
                    value={replyTo}
                    onChange={e => setReplyTo(e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-600 focus:ring-0"
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

              {/* Rich Text Toolbar */}
              <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-1 flex-wrap bg-slate-950/20">
                <ToolbarButton icon={<Bold size={16} />} onClick={() => execCommand('bold')} title="Bold" />
                <ToolbarButton icon={<Italic size={16} />} onClick={() => execCommand('italic')} title="Italic" />
                <ToolbarButton icon={<Underline size={16} />} onClick={() => execCommand('underline')} title="Underline" />
                <div className="w-px h-4 bg-slate-800 mx-1" />
                <ToolbarButton icon={<List size={16} />} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                <ToolbarButton icon={<ListOrdered size={16} />} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
                <div className="w-px h-4 bg-slate-800 mx-1" />
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
                    isHtmlMode ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  <Code size={14} />
                  {isHtmlMode ? "Visual" : "Source"}
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px]">
                {isHtmlMode ? (
                  <textarea 
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full h-full bg-transparent border-none text-sm font-mono text-blue-400 placeholder:text-slate-700 focus:ring-0 resize-none"
                    placeholder="Enter HTML source code..."
                  />
                ) : (
                  <div 
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorChange}
                    className="w-full h-full bg-transparent border-none text-sm text-slate-200 focus:outline-none min-h-[200px] prose prose-invert prose-sm max-w-none"
                  />
                )}

                <AnimatePresence>
                  {analysis && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className={cn(
                            analysis.riskLevel === 'Low' ? "text-green-500" : 
                            analysis.riskLevel === 'Medium' ? "text-yellow-500" : "text-red-500"
                          )} />
                          <span className="text-sm font-bold text-white">Deliverability Score: {analysis.score}/100</span>
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          analysis.riskLevel === 'Low' ? "bg-green-500/10 text-green-400" : 
                          analysis.riskLevel === 'Medium' ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {analysis.riskLevel} Risk
                        </span>
                      </div>

                      {analysis.spammyWordsFound.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold w-full mb-1">Spam Triggers:</span>
                          {analysis.spammyWordsFound.map(word => (
                            <span key={word} className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px]">{word}</span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Suggestions:</span>
                        <ul className="text-xs text-slate-300 space-y-1">
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
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
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
                      analysis ? "bg-green-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800"
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
                      showTemplateSelector ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    title="Use template"
                  >
                    <FileText size={20} />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
                    title="Save as template"
                  >
                    {isSavingTemplate ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
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
      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all"
      title={title}
    >
      {icon}
    </button>
  );
}
