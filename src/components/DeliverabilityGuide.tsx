import React from 'react';
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, ExternalLink, X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onClose: () => void;
}

export default function DeliverabilityGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Deliverability Guide</h2>
              <p className="text-sm text-slate-400">Ensure your emails land in the inbox, not spam.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Section 1: Authentication */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              1. Domain Authentication
            </h3>
            <p className="text-sm text-slate-400">
              Spam filters check if you are authorized to send from your domain. You MUST configure these three records in your DNS:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                <p className="text-sm font-bold text-white mb-1">SPF (Sender Policy Framework)</p>
                <p className="text-xs text-slate-400">Specifies which IP addresses and domains are allowed to send emails on your behalf.</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                <p className="text-sm font-bold text-white mb-1">DKIM (DomainKeys Identified Mail)</p>
                <p className="text-xs text-slate-400">Adds a digital signature to your emails, proving they weren't tampered with in transit.</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                <p className="text-sm font-bold text-white mb-1">DMARC (Domain-based Message Authentication)</p>
                <p className="text-xs text-slate-400">Tells receiving servers what to do if SPF or DKIM fails (e.g., "quarantine" or "reject").</p>
              </div>
            </div>
          </section>

          {/* Section 2: Content Best Practices */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              2. Content Best Practices
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Avoid Spammy Keywords:</strong> Words like "Free", "Winner", "Urgent", "Guaranteed", and "No Cost" often trigger filters.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Balance Text & Images:</strong> Emails with only images and no text are highly suspicious to spam filters.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Personalize:</strong> Use the recipient's name. Generic "Dear Customer" greetings are common in spam.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Clean Links:</strong> Don't use URL shorteners (like bit.ly) in emails, as they are frequently used by phishers.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Technical Reputation */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              3. Technical Reputation
            </h3>
            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                If you are using a custom SMTP server, ensure your server IP is not on any <strong>Blacklists</strong>. 
                You can check your IP reputation on sites like <a href="https://mxtoolbox.com/blacklists.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">MXToolbox <ExternalLink size={12} /></a>.
              </p>
              <div className="pt-3 border-t border-blue-500/10">
                <p className="text-xs font-bold text-blue-400 uppercase mb-1">IP Warm-up</p>
                <p className="text-xs text-slate-400">If you have a new IP, start by sending small volumes of email and gradually increase it over several weeks to build trust with ISPs.</p>
              </div>
            </div>
          </section>

          {/* Section 4: List Hygiene */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              4. List Hygiene
            </h3>
            <p className="text-sm text-slate-400">
              Sending to invalid or inactive addresses is a major spam signal.
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Remove Bounces:</strong> Immediately remove any email address that results in a "Hard Bounce".</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                <span><strong>Sunset Policy:</strong> Stop sending to users who haven't opened your emails in 3-6 months.</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all"
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
