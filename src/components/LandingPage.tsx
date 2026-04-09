import React from 'react';
import { motion } from 'motion/react';
import { 
  Sun,
  Moon,
  Mail, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Globe, 
  Lock, 
  ChevronRight, 
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Layout,
  Inbox,
  Send,
  FileText,
  Trash2,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onGetStarted: (mode?: 'login' | 'register') => void;
  onShowPrivacy: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function LandingPage({ onGetStarted, onShowPrivacy, isDarkMode, onToggleTheme }: Props) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Mail className="text-white w-6 h-6" />
            </div>
            <span className="font-display text-2xl tracking-tight text-slate-900 dark:text-white uppercase">Gazneftgroups</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#security">Security</NavLink>
            <NavLink href="#ai">AI Tools</NavLink>
            <button 
              onClick={() => onGetStarted('login')}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Login
            </button>
            <button 
              onClick={onToggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <button 
            onClick={() => onGetStarted('register')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            Get Started
            <ChevronRight size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={14} />
              The Future of Webmail
            </span>
            <h1 className="text-[18vw] md:text-[15vw] lg:text-[12vw] font-display text-slate-900 dark:text-white mb-4 tracking-tight leading-[0.8] uppercase">
              Gazneft <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-700">Groups.</span>
            </h1>
            <div className="max-w-xl mx-auto mb-12">
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Manage up to 20 accounts in one unified, AI-powered interface. 
                Built for speed, privacy, and deliverability.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => onGetStarted('register')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 text-lg"
              >
                Start for Free
                <ArrowRight size={20} />
              </button>
              <button className="w-full sm:w-auto bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold py-4 px-10 rounded-2xl transition-all border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-lg">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-24 relative max-w-6xl mx-auto"
          >
            <div className="absolute inset-0 bg-blue-600/20 blur-[100px] -z-10 rounded-full" />
            
            {/* Hero Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="mb-16 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] group"
            >
              <img 
                src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop" 
                alt="Gazneftgroups Dashboard" 
                className="w-full h-[500px] object-cover opacity-70 dark:opacity-70 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-transparent to-transparent opacity-60" />
            </motion.div>

            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 shadow-2xl overflow-hidden aspect-[16/10]">
              <div className="bg-white dark:bg-slate-950 rounded-2xl w-full h-full border border-slate-200 dark:border-slate-800/50 flex overflow-hidden">
                {/* Mock Sidebar */}
                <div className="w-1/4 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4 hidden sm:block bg-slate-50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: <Inbox size={14} />, label: "Inbox", active: true },
                      { icon: <Send size={14} />, label: "Sent" },
                      { icon: <FileText size={14} />, label: "Drafts" },
                      { icon: <Trash2 size={14} />, label: "Trash" }
                    ].map((item, i) => (
                      <div key={i} className={cn("flex items-center gap-3 p-2 rounded-lg", item.active ? "bg-blue-600/10 text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")}>
                        {item.icon}
                        <div className={cn("h-3 rounded w-16", item.active ? "bg-blue-400/20" : "bg-slate-200 dark:bg-slate-800/50")} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mock Content */}
                <div className="flex-1 flex flex-col">
                  <div className="h-16 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                    <div className="h-8 bg-slate-100 dark:bg-slate-900 rounded-xl w-1/3" />
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900" />
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900" />
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-hidden">
                    {[
                      { from: "Sarah Miller", subject: "Project Update - Q2 Goals", time: "10:24 AM", unread: true },
                      { from: "GitHub", subject: "[Security] Alert for repository...", time: "9:15 AM" },
                      { from: "Stripe", subject: "Your weekly payout is on its way", time: "Yesterday" },
                      { from: "Framer", subject: "New features are here!", time: "Apr 7" },
                      { from: "Slack", subject: "You have 3 unread messages", time: "Apr 6" }
                    ].map((mail, i) => (
                      <div key={i} className={cn("p-4 rounded-xl border flex items-center justify-between group transition-all", mail.unread ? "bg-blue-600/5 border-blue-500/20" : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/30")}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full", mail.unread ? "bg-blue-500" : "bg-transparent")} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-xs font-bold", mail.unread ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{mail.from}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-600">{mail.time}</span>
                            </div>
                            <p className={cn("text-xs truncate", mail.unread ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500")}>{mail.subject}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><Clock size={10} className="text-slate-400 dark:text-slate-500" /></div>
                          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><Trash2 size={10} className="text-slate-400 dark:text-slate-500" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-white dark:bg-slate-950 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display text-slate-900 dark:text-white mb-6 uppercase leading-[0.9]">Everything you need <br />to manage your mail.</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">One inbox, all your accounts. No more switching tabs or losing track of important conversations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Layers className="text-blue-500" />}
              title="Multi-Account Sync"
              description="Connect up to 20 IMAP/SMTP accounts including Gmail, Outlook, and custom domains."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title="Instant Deliverability"
              description="AI-powered spam analysis ensures your emails land in the inbox, not the junk folder."
            />
            <div id="ai">
              <FeatureCard 
                icon={<Sparkles className="text-purple-500" />}
                title="Smart AI Tools"
                description="Summarize long threads and generate professional replies in seconds with Gemini AI."
              />
            </div>
            <FeatureCard 
              icon={<ShieldCheck className="text-green-500" />}
              title="End-to-End Security"
              description="OAuth 2.0 support and encrypted storage keep your credentials and data safe."
            />
            <FeatureCard 
              icon={<MessageSquare className="text-pink-500" />}
              title="Rich Text Editor"
              description="Compose beautiful emails with our built-in visual editor or raw HTML source mode."
            />
            <FeatureCard 
              icon={<Layout className="text-orange-500" />}
              title="Modern Interface"
              description="A sleek, dark-mode first UI designed for maximum productivity and minimal eye strain."
            />
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-32 px-6 bg-white dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 border border-purple-500/20">
              <Sparkles className="text-purple-500 w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-7xl font-display text-slate-900 dark:text-white mb-8 leading-[0.85] uppercase">AI-Powered <br />Intelligence.</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 font-medium">
              Harness the power of Gemini AI to transform how you handle email. Summarize long threads, detect priorities, and generate professional replies in seconds.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Smart Thread Summarization</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Context-Aware Smart Replies</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Automated Priority Detection</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles size={14} className="text-purple-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Gemini AI Assistant</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/50">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 uppercase font-bold tracking-widest">Summary</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                      "This thread discusses the Q3 project timeline. The team has agreed on the October 15th launch date, but needs final approval on the marketing budget by Friday."
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase border border-blue-500/20">Sounds good!</div>
                    <div className="px-3 py-1.5 bg-purple-600/10 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-bold uppercase border border-purple-500/20">I'll check the budget</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 px-6 bg-slate-50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 border border-green-500/20">
              <Lock className="text-green-500 w-8 h-8" />
            </div>
            <h2 className="text-5xl md:text-7xl font-display text-slate-900 dark:text-white mb-8 leading-[0.85] uppercase">Privacy is not <br />an option.</h2>
            <div className="space-y-6">
              <SecurityItem title="Zero-Knowledge Architecture" description="We don't store your passwords. OAuth tokens are encrypted and handled securely." />
              <SecurityItem title="No Data Mining" description="Unlike free providers, we never scan your emails for advertising or tracking purposes." />
              <SecurityItem title="Advanced Encryption" description="All data in transit and at rest is protected by industry-standard AES-256 encryption." />
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-green-500/10 blur-[100px] rounded-full" />
            <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">SSL/TLS Encryption</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">OAuth 2.0 Protocol</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">DMARC/SPF/DKIM Compliance</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-[12vw] md:text-[10vw] font-display text-slate-900 dark:text-white mb-8 leading-[0.8] uppercase">Ready to <br />upgrade?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 leading-relaxed font-medium">Join thousands of power users who trust Gazneftgroups for their professional communication.</p>
          <button 
            onClick={() => onGetStarted('register')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-2xl shadow-blue-600/30 text-xl"
          >
            Get Started Now
          </button>
          <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">No credit card required. Free forever for basic use.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="text-white w-5 h-5" />
              </div>
              <span className="font-display text-xl text-slate-900 dark:text-white uppercase tracking-tight">Gazneftgroups</span>
            </div>
            <p className="text-slate-500 dark:text-slate-500 max-w-sm">The ultimate webmail client for power users. Secure, fast, and powered by AI.</p>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#security" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Security</a></li>
              <li><a href="#ai" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">AI Tools</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a></li>
              <li><button onClick={onShowPrivacy} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left">Privacy</button></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-600">© 2026 Gazneftgroups. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Globe size={16} className="text-slate-400 dark:text-slate-600" />
            <span className="text-xs text-slate-400 dark:text-slate-600">English (US)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <a 
      href={href} 
      className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-blue-500/50 transition-all group">
      <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function SecurityItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1"><CheckCircle2 size={20} className="text-blue-600 dark:text-blue-500" /></div>
      <div>
        <h4 className="text-slate-900 dark:text-white font-bold mb-1">{title}</h4>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{description}</p>
      </div>
    </div>
  );
}
