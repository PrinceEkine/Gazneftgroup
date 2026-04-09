import React from 'react';
import { Shield, ArrowLeft, Mail, Lock, Eye, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 p-6 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to App
        </button>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
            <p className="text-slate-500">Last updated: April 9, 2026</p>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="text-blue-600 dark:text-blue-500" size={20} />
              Introduction
            </h2>
            <p className="leading-relaxed">
              Gazneftgroups ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our webmail application. This application is currently intended for internal use by our team and authorized testers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="text-blue-600 dark:text-blue-500" size={20} />
              Google User Data
            </h2>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <p className="font-medium text-slate-900 dark:text-white">How we use Google Data:</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><span className="text-blue-600 dark:text-blue-400 font-semibold">Authentication:</span> We use Google OAuth to verify your identity and allow you to link your Gmail accounts.</li>
                <li><span className="text-blue-600 dark:text-blue-400 font-semibold">Email Access:</span> Our app uses the <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-pink-600 dark:text-pink-400">mail.google.com</code> scope to allow you to read, search, and send emails directly through our interface.</li>
                <li><span className="text-blue-600 dark:text-blue-400 font-semibold">Storage:</span> We do NOT store your emails on our servers. Emails are fetched in real-time via Google's APIs and displayed in your browser.</li>
                <li><span className="text-blue-600 dark:text-blue-400 font-semibold">Tokens:</span> OAuth tokens are stored securely in our database to maintain your connection. These tokens are only used to perform actions you initiate (like refreshing your inbox).</li>
              </ul>
              <div className="mt-4 p-4 bg-blue-600/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs leading-relaxed italic">
                  Gazneftgroups's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google API Service User Data Policy</a>, including the Limited Use requirements.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="text-blue-600 dark:text-blue-500" size={20} />
              Data Collection
            </h2>
            <p className="leading-relaxed">
              We collect minimal data necessary to provide the service:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Your basic profile information (name, email, profile picture) from Google.</li>
              <li>Configuration details for any manual IMAP/SMTP accounts you add.</li>
              <li>Application settings (e.g., dark mode preferences).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="text-blue-600 dark:text-blue-500" size={20} />
              Data Sharing
            </h2>
            <p className="leading-relaxed">
              We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your data is only used to facilitate the email services you request within the application.
            </p>
          </section>

          <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions regarding this privacy policy, you may contact us at:
              <br />
              <span className="text-blue-600 dark:text-blue-400">princegogoekine@gmail.com</span>
            </p>
          </section>
        </div>

        <div className="mt-20 text-center text-slate-500 dark:text-slate-600 text-sm">
          &copy; 2026 Gazneftgroups. All rights reserved.
        </div>
      </div>
    </div>
  );
}
