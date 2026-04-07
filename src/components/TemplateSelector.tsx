import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Check, Search, Loader2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailTemplate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  user: any;
  onSelect: (template: EmailTemplate) => void;
  onClose: () => void;
}

export default function TemplateSelector({ user, onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    const templatesRef = collection(db, 'users', user.uid, 'templates');
    const unsubscribe = onSnapshot(templatesRef, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate));
      setTemplates(t);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'templates', id));
    } catch (error) {
      console.error('Failed to delete template', error);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText size={16} className="text-blue-500" />
          Email Templates
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <Check size={16} />
        </button>
      </div>

      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-slate-500" size={20} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-xs">No templates found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filteredTemplates.map(template => (
              <button 
                key={template.id}
                onClick={() => onSelect(template)}
                className="w-full text-left p-3 hover:bg-slate-800 transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{template.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{template.subject}</p>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, template.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
