import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Mail, Server, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
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
    color: '#3b82f6'
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accounts.length >= 20) {
      alert("Maximum 20 accounts allowed.");
      return;
    }

    try {
      const accountsRef = collection(db, 'users', user.uid, 'accounts');
      await addDoc(accountsRef, {
        ...newAccount,
        ownerUid: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewAccount({ provider: 'gmail', imapPort: 993, smtpPort: 465, color: '#3b82f6' });
    } catch (error) {
      console.error("Failed to add account", error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to remove this account?")) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
    } catch (error) {
      console.error("Failed to delete account", error);
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
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
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
                    onChange={e => setNewAccount({...newAccount, provider: e.target.value as any})}
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-all"
                >
                  Save Account
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
        </div>
      </motion.div>
    </div>
  );
}
