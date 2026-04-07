import React from 'react';
import { motion } from 'motion/react';
import { 
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
  Layout
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onGetStarted: (mode?: 'login' | 'register') => void;
}

export default function LandingPage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Mail className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">Gazneft</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#security">Security</NavLink>
            <NavLink href="#ai">AI Tools</NavLink>
            <button 
              onClick={() => onGetStarted('login')}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Login
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
              <Sparkles size={14} />
              The Future of Webmail is Here
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 tracking-tight leading-[0.9]">
              Secure Mail for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Power Users.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Manage up to 20 accounts in one unified, AI-powered interface. 
              Built for speed, privacy, and deliverability.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => onGetStarted('register')}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 text-lg"
              >
                Start for Free
                <ArrowRight size={20} />
              </button>
              <button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-2xl transition-all border border-slate-800 flex items-center justify-center gap-2 text-lg">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-24 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-blue-600/20 blur-[100px] -z-10 rounded-full" />
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl overflow-hidden aspect-[16/10]">
              <div className="bg-slate-950 rounded-2xl w-full h-full border border-slate-800/50 flex overflow-hidden">
                {/* Mock Sidebar */}
                <div className="w-1/4 border-r border-slate-800 p-4 space-y-4 hidden sm:block">
                  <div className="h-8 bg-slate-900 rounded-lg w-3/4" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-6 bg-slate-900/50 rounded-md w-full" />
                    ))}
                  </div>
                </div>
                {/* Mock Content */}
                <div className="flex-1 p-6 space-y-6">
                  <div className="h-10 bg-slate-900 rounded-xl w-full" />
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-slate-900/30 rounded-xl w-full border border-slate-800/30" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything you need to <br />manage your digital life.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">One platform, all your accounts. No more switching tabs or losing track of important conversations.</p>
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
            <FeatureCard 
              icon={<Sparkles className="text-purple-500" />}
              title="Smart AI Tools"
              description="Summarize long threads and generate professional replies in seconds with Gemini AI."
            />
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

      {/* Security Section */}
      <section id="security" className="py-32 px-6 bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 border border-green-500/20">
              <Lock className="text-green-500 w-8 h-8" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">Privacy is not an option. <br />It's a requirement.</h2>
            <div className="space-y-6">
              <SecurityItem title="Zero-Knowledge Architecture" description="We don't store your passwords. OAuth tokens are encrypted and handled securely." />
              <SecurityItem title="No Data Mining" description="Unlike free providers, we never scan your emails for advertising or tracking purposes." />
              <SecurityItem title="Advanced Encryption" description="All data in transit and at rest is protected by industry-standard AES-256 encryption." />
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-green-500/10 blur-[100px] rounded-full" />
            <div className="relative bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">SSL/TLS Encryption</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">OAuth 2.0 Protocol</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">DMARC/SPF/DKIM Compliance</span>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">Ready to upgrade your <br />email experience?</h2>
          <p className="text-lg text-slate-400 mb-12 leading-relaxed">Join thousands of power users who trust Gazneft for their professional communication.</p>
          <button 
            onClick={() => onGetStarted('register')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-2xl shadow-blue-600/30 text-xl"
          >
            Get Started Now
          </button>
          <p className="mt-6 text-sm text-slate-500">No credit card required. Free forever for basic use.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-800/50 bg-slate-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-white">Gazneft</span>
            </div>
            <p className="text-slate-500 max-w-sm">The ultimate webmail client for power users. Secure, fast, and powered by AI.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">AI Tools</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-400 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">© 2026 Gazneftgroup. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Globe size={16} className="text-slate-600" />
            <span className="text-xs text-slate-600">English (US)</span>
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
      className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-blue-500/50 transition-all group">
      <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function SecurityItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1"><CheckCircle2 size={20} className="text-blue-500" /></div>
      <div>
        <h4 className="text-white font-bold mb-1">{title}</h4>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </div>
  );
}
