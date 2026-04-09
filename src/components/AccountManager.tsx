import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Mail, Server, Key, CheckCircle2, AlertCircle, RefreshCw, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { EmailAccount } from '../types';
import { cn } from '../lib/utils';

interface Props {
  accounts: EmailAccount[];
  onClose: () => void;
  user: any;
}

export default function AccountManager({ accounts, onClose, user }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<EmailAccount>>({
    provider: 'gmail',
    imapPort: 993,
    smtpPort: 465,
    color: '#3b82f6',
    authType: 'password'
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { tokens, userInfo } = event.data;
        handleGoogleAuthSuccess(tokens, userInfo);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleAuthSuccess = async (tokens: any, userInfo: any) => {
    setIsSaving(true);
    setStatus(null);
    try {
      const accountsRef = collection(db, 'users', user.uid, 'accounts');
      await addDoc(accountsRef, {
        ownerUid: user.uid,
        email: userInfo.email,
        label: `Gmail (${userInfo.name})`,
        provider: 'gmail',
        authType: 'oauth2',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        color: '#ea4335',
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: "Google account connected successfully!" });
      setTimeout(() => {
        setIsAdding(false);
        setStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error("Failed to add Google account", error);
      setStatus({ type: 'error', message: "Failed to connect Google account: " + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const connectWithGoogle = async () => {
    // Open the window immediately to avoid popup blockers
    const authWindow = window.open('about:blank', 'google_auth', 'width=600,height=700');
    if (!authWindow) {
      setStatus({ type: 'error', message: "Popup blocked! Please allow popups for this site to connect your Google account." });
      return;
    }
    
    authWindow.document.write('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:white;"><div>Connecting to Google...</div></body></html>');

    try {
      const response = await fetch('/api/auth/google/url');
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text.substring(0, 200));
        authWindow.close();
        
        let errorMsg = "Backend error: The server returned an invalid response.";
        if (text.includes("<!DOCTYPE html>")) {
          errorMsg += " (Received HTML instead of JSON. This usually means the API redirect is not working on Netlify.)";
        } else {
          errorMsg += " (" + text.substring(0, 50) + "...)";
        }
        
        setStatus({ type: 'error', message: errorMsg });
        return;
      }
      const { url, error } = await response.json();
      if (error) {
        authWindow.close();
        setStatus({ type: 'error', message: "Backend error: " + error });
        return;
      }
      authWindow.location.href = url;
    } catch (error: any) {
      console.error("Failed to get Google auth URL", error);
      authWindow.close();
      setStatus({ type: 'error', message: "Failed to connect to backend: " + error.message });
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accounts.length >= 20) {
      setStatus({ type: 'error', message: "Maximum 20 accounts allowed." });
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      const accountsRef = collection(db, 'users', user.uid, 'accounts');
      await addDoc(accountsRef, {
        ...newAccount,
        ownerUid: user.uid,
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: "Account saved successfully!" });
      setTimeout(() => {
        setIsAdding(false);
        setStatus(null);
        setNewAccount({ provider: 'gmail', imapPort: 993, smtpPort: 465, color: '#3b82f6', authType: 'password' });
      }, 2000);
    } catch (error: any) {
      console.error("Failed to add account", error);
      setStatus({ type: 'error', message: "Failed to save account: " + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
      setConfirmDelete(null);
      setStatus({ type: 'success', message: "Account removed successfully." });
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      console.error("Failed to delete account", error);
      setStatus({ type: 'error', message: "Failed to remove account: " + error.message });
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            host: newAccount.imapHost,
            port: newAccount.imapPort,
            user: newAccount.email,
            pass: newAccount.password
          },
          type: 'imap'
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON. Ensure the backend is running.");
      }

      const data = await response.json();
      if (data.success) {
        setTestResult({ success: true, message: "Connection successful!" });
      } else {
        setTestResult({ success: false, message: data.error || "Connection failed" });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderChange = (provider: 'gmail' | 'outlook' | 'custom') => {
    const updates: Partial<EmailAccount> = { provider };
    
    if (provider === 'gmail') {
      updates.imapHost = 'imap.gmail.com';
      updates.imapPort = 993;
      updates.smtpHost = 'smtp.gmail.com';
      updates.smtpPort = 465;
      updates.color = '#ea4335';
    } else if (provider === 'outlook') {
      updates.imapHost = 'outlook.office365.com';
      updates.imapPort = 993;
      updates.smtpHost = 'smtp.office365.com';
      updates.smtpPort = 587;
      updates.color = '#0078d4';
    } else {
      updates.imapHost = '';
      updates.imapPort = 993;
      updates.smtpHost = '';
      updates.smtpPort = 587;
      updates.color = '#3b82f6';
    }
    
    setNewAccount({ ...newAccount, ...updates });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Manage Accounts</h2>
            <p className="text-sm text-slate-400">Link up to 20 email accounts</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!isAdding ? (
            <>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={connectWithGoogle}
                  disabled={isSaving}
                  className="bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin text-blue-500" size={20} /> : <Chrome size={20} className="text-blue-500" />}
                  {isSaving ? "Connecting..." : "Connect with Google"}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or add manually</span></div>
                </div>

                {accounts.map(acc => (
                  <div key={acc.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{acc.label || acc.email}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{acc.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setConfirmDelete(acc.id)}
                        className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {accounts.length < 20 && (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 p-8 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-400 transition-all"
                  >
                    <Plus size={24} />
                    <span className="font-medium">Add New Account</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Provider</label>
                  <select 
                    value={newAccount.provider}
                    onChange={e => handleProviderChange(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="custom">Custom (IMAP/SMTP)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Label</label>
                  <input 
                    type="text"
                    placeholder="Work, Personal, etc."
                    value={newAccount.label}
                    onChange={e => setNewAccount({...newAccount, label: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <input 
                  type="email"
                  placeholder="name@example.com"
                  value={newAccount.email}
                  onChange={e => setNewAccount({...newAccount, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">App Password / Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={newAccount.password}
                    onChange={e => setNewAccount({...newAccount, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">For Gmail/Outlook, use an App Password for better security.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">IMAP Host</label>
                  <input 
                    type="text"
                    placeholder="imap.gmail.com"
                    value={newAccount.imapHost}
                    onChange={e => setNewAccount({...newAccount, imapHost: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">IMAP Port</label>
                  <input 
                    type="number"
                    value={newAccount.imapPort}
                    onChange={e => setNewAccount({...newAccount, imapPort: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">SMTP Host</label>
                  <input 
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={newAccount.smtpHost}
                    onChange={e => setNewAccount({...newAccount, smtpHost: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">SMTP Port</label>
                  <input 
                    type="number"
                    value={newAccount.smtpPort}
                    onChange={e => setNewAccount({...newAccount, smtpPort: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={testConnection}
                  disabled={isTesting}
                  className="flex-1 border border-slate-700 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isTesting ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
                  Test Connection
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="animate-spin" size={16} />}
                  {isSaving ? "Saving..." : "Save Account"}
                </button>
              </div>

              {testResult && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center gap-3 text-sm",
                  testResult.success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {testResult.message}
                </div>
              )}

              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="w-full text-slate-500 hover:text-white text-sm font-medium py-2"
              >
                Cancel
              </button>
            </form>
          )}

          {status && (
            <div className={cn(
              "p-3 rounded-lg flex items-center gap-3 text-sm mt-4",
              status.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </div>
          )}
        </div>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Delete Account?</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Are you sure you want to delete this account? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDeleteAccount(confirmDelete)}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
