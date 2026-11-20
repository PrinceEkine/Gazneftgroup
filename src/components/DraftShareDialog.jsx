import React, { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Share2, ShieldCheck, Trash2, X } from 'lucide-react';
import { importDraft, revokeShare, shareDraft } from '../lib/secureDraftShare';
import { cn } from '../lib/utils';
/**
 * UI for PIN-protected draft sharing between GNmail users (see
 * `src/lib/secureDraftShare.ts` for the E2E-encryption model). Two surfaces:
 * a popover anchored in the compose footer (share) and a centered modal in
 * the drafts folder (import). Shares carry to/subject/body only — attachments
 * are never included.
 */
const inputClass = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50';
export function ShareDraftPopover({ draft, onClose }) {
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [code, setCode] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const handleShare = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const receipt = await shareDraft(draft, pin.trim());
            setCode(receipt.code);
        }
        catch (err) {
            setError(err.message ?? 'Sharing failed');
        }
        finally {
            setBusy(false);
        }
    };
    const handleCopy = async () => {
        if (!code)
            return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            setError('Copy failed — select the code manually.');
        }
    };
    const handleRevoke = async () => {
        if (!code)
            return;
        setBusy(true);
        setError(null);
        try {
            await revokeShare(code);
            setCode(null);
            setPin('');
        }
        catch (err) {
            setError(err.message ?? 'Revoke failed');
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Share2 size={16} className="text-blue-600 dark:text-blue-500"/>
          Share draft securely
        </h3>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <X size={16}/>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex gap-1.5">
          <ShieldCheck size={14} className="flex-none mt-px text-blue-500"/>
          Encrypted on this device with your PIN. Only a signed-in GNmail user
          with the code + PIN can read it. Text only — attachments are not
          shared. Expires in 7 days.
        </p>

        {code ? (<div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-center text-lg font-mono font-bold tracking-[0.2em] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white select-all">
                {code}
              </code>
              <button type="button" onClick={handleCopy} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all" title="Copy code">
                {copied ? <Check size={16}/> : <Copy size={16}/>}
              </button>
            </div>
            <button type="button" onClick={handleRevoke} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
              Revoke this share
            </button>
          </div>) : (<form onSubmit={handleShare} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">PIN (4–8 digits)</label>
              <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" className={cn(inputClass, 'tracking-[0.3em] text-center font-mono')} required/>
            </div>
            <button type="submit" disabled={busy || pin.trim().length < 4} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 size={12} className="animate-spin"/>}
              Encrypt & share
            </button>
          </form>)}

        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    </div>);
}
export function ImportDraftModal({ defaultAccountId, userId, onImport, onClose, }) {
    const [code, setCode] = useState('');
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const handleImport = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const shared = await importDraft(code, pin.trim());
            const now = new Date().toISOString();
            onImport({
                id: '',
                accountId: defaultAccountId,
                userId,
                to: shared.to,
                subject: shared.subject,
                body: shared.body,
                createdAt: now,
                updatedAt: now,
                type: 'draft',
            });
            onClose();
        }
        catch (err) {
            setError(err.message ?? 'Import failed');
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound size={16} className="text-blue-600 dark:text-blue-500"/>
            Import shared draft
          </h3>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X size={18}/>
          </button>
        </div>
        <form onSubmit={handleImport} className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Share code</label>
            <input type="text" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="ABCDEFGH" className={cn(inputClass, 'tracking-[0.2em] font-mono uppercase')} required/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">PIN</label>
            <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" className={cn(inputClass, 'tracking-[0.3em] text-center font-mono')} required/>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 size={16} className="animate-spin"/>}
            Decrypt & open in compose
          </button>
        </form>
      </div>
    </div>);
}
