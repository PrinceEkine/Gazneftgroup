import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  AlertCircle, 
  Plus, 
  Settings, 
  LogOut, 
  Mail,
  Clock,
  ChevronRight,
  Search,
  RefreshCw,
  User,
  Menu,
  X,
  Lock,
  AtSign,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
  ShieldCheck
} from 'lucide-react';
import { auth, db } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { EmailAccount, EmailMessage, EmailDraft } from './types';
import AccountManager from './components/AccountManager';
import InboxView from './components/InboxView';
import ComposeModal from './components/ComposeModal';
import DeliverabilityGuide from './components/DeliverabilityGuide';
import LandingPage from './components/LandingPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Logo } from './components/Logo';

type AuthMode = 'login' | 'register' | 'forgot';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [activeFolder, setActiveFolder] = useState<string>('inbox');
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<EmailDraft | undefined>(undefined);
  const [isDeliverabilityGuideOpen, setIsDeliverabilityGuideOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(window.location.search.includes('page=privacy'));

  useEffect(() => {
    const handlePopState = () => {
      setShowPrivacy(window.location.search.includes('page=privacy'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const togglePrivacy = (show: boolean) => {
    setShowPrivacy(show);
    const url = new URL(window.location.href);
    if (show) {
      url.searchParams.set('page', 'privacy');
    } else {
      url.searchParams.delete('page');
    }
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth States
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Listen for accounts
        const accountsRef = collection(db, 'users', user.uid, 'accounts');
        onSnapshot(accountsRef, (snapshot) => {
          const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailAccount));
          setAccounts(accs);
        });
      }
    });
    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Check your inbox.");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => togglePrivacy(false)} />;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage 
        onGetStarted={(mode) => {
          if (mode) setAuthMode(mode);
          setShowLanding(false);
        }} 
        onShowPrivacy={() => togglePrivacy(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />;
    }

    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative z-10"
        >
          <div className="absolute top-6 right-6">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <button 
            onClick={() => setShowLanding(true)}
            className="absolute top-6 left-6 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-20 h-20 rounded-[1.5rem] bg-slate-950 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10 border border-slate-200 dark:border-white/5">
            <Logo className="w-12 h-12" />
          </div>
          
          <h1 className="text-4xl font-display text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Gazneftgroups</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Secure, multi-account webmail for power users.</p>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <AnimatePresence mode="wait">
              {authMode === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Email Address</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                  {authMode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[10px] text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-bold uppercase tracking-wider"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Create Account' : 'Reset Password'
              )}
            </button>
          </form>

          {error && <p className="mt-4 text-xs text-red-500 dark:text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
          {message && <p className="mt-4 text-xs text-green-500 dark:text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20">{message}</p>}

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-2 text-slate-500 font-bold">Or continue with</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="mt-6 w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google
          </button>

          <div className="mt-8 text-sm text-slate-500">
            {authMode === 'login' ? (
              <>Don't have an account? <button onClick={() => setAuthMode('register')} className="text-blue-600 dark:text-blue-500 font-bold hover:underline">Sign up</button></>
            ) : (
              <button onClick={() => setAuthMode('login')} className="flex items-center gap-2 mx-auto text-blue-600 dark:text-blue-500 font-bold hover:underline">
                <ArrowLeft size={14} /> Back to login
              </button>
            )}
          </div>

          <div className="mt-6">
            <button 
              onClick={() => setShowPrivacy(true)}
              className="text-[10px] text-slate-600 hover:text-slate-400 uppercase font-bold tracking-widest transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950 z-20"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg shadow-blue-500/10">
                  <Logo className="w-6 h-6" />
                </div>
                <span className="font-display text-xl tracking-tight uppercase text-slate-900 dark:text-white">Gazneftgroups</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="px-4 mb-6">
              <button 
                onClick={() => setIsComposeOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus size={20} />
                Compose
              </button>
            </div>

            <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mailboxes</div>
              <NavItem icon={<Inbox size={18} />} label="Inbox" active={activeFolder === 'inbox'} onClick={() => setActiveFolder('inbox')} />
              <NavItem icon={<Clock size={18} />} label="Snoozed" active={activeFolder === 'snoozed'} onClick={() => setActiveFolder('snoozed')} />
              <NavItem icon={<Send size={18} />} label="Sent" active={activeFolder === 'sent'} onClick={() => setActiveFolder('sent')} />
              <NavItem icon={<FileText size={18} />} label="Drafts" active={activeFolder === 'drafts'} onClick={() => setActiveFolder('drafts')} />
              <NavItem icon={<Trash2 size={18} />} label="Trash" active={activeFolder === 'trash'} onClick={() => setActiveFolder('trash')} />
              <NavItem icon={<AlertCircle size={18} />} label="Spam" active={activeFolder === 'spam'} onClick={() => setActiveFolder('spam')} />

              <div className="mt-8 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deliverability</div>
              <NavItem 
                icon={<ShieldCheck size={18} className="text-blue-500" />} 
                label="Deliverability Guide" 
                onClick={() => setIsDeliverabilityGuideOpen(true)} 
              />

              <div className="mt-8 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Accounts ({accounts.length}/20)</span>
                <button onClick={() => setIsAccountManagerOpen(true)} className="text-blue-500 hover:text-blue-400">
                  <Plus size={14} />
                </button>
              </div>
              <NavItem 
                icon={<div className="w-2 h-2 rounded-full bg-slate-400" />} 
                label="All Accounts" 
                active={selectedAccountId === 'all'} 
                onClick={() => setSelectedAccountId('all')} 
              />
              {accounts.map(acc => (
                <NavItem 
                  key={acc.id}
                  icon={<div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />} 
                  label={acc.label || acc.email} 
                  active={selectedAccountId === acc.id} 
                  onClick={() => setSelectedAccountId(acc.id)} 
                />
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 px-2 py-3">
                <img src={user.photoURL} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900/50">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <Menu size={20} />
              </button>
            )}
            <div className="relative w-96 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all">
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={() => setIsAccountManagerOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <InboxView 
            accountId={selectedAccountId} 
            folder={activeFolder} 
            searchQuery={searchQuery}
            accounts={accounts}
            onOpenDraft={(draft) => {
              setDraftToEdit(draft);
              setIsComposeOpen(true);
            }}
          />
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAccountManagerOpen && (
          <AccountManager 
            accounts={accounts} 
            onClose={() => setIsAccountManagerOpen(false)} 
            user={user}
          />
        )}
        {isComposeOpen && (
          <ComposeModal 
            accounts={accounts} 
            onClose={() => {
              setIsComposeOpen(false);
              setDraftToEdit(undefined);
            }} 
            user={user}
            initialDraft={draftToEdit}
          />
        )}
        {isDeliverabilityGuideOpen && (
          <DeliverabilityGuide 
            onClose={() => setIsDeliverabilityGuideOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
        active 
          ? "bg-blue-600/10 text-blue-600 dark:text-blue-500" 
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
      )}
    >
      <span className={cn("transition-colors", active ? "text-blue-600 dark:text-blue-500" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
        {icon}
      </span>
      {label}
    </button>
  );
}
