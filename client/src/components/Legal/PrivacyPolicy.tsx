import { 
  ShieldCheck, Database, Settings, 
  Share2, Clock, UserCog, MessageCircle, CheckCircle2, ArrowLeft,
  Scale, Key, Globe, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function PrivacyPolicy() {
  const effectiveDate = "April 29, 2026";
  const lastUpdated = "April 29, 2026";

  const sections = [
    {
      id: 1,
      title: "Identity of Data Fiduciary",
      icon: ShieldCheck,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: "Sidenote is operated by:",
      bullets: [
        "Name: Yogesh Yadav (Grievance Officer and Data Fiduciary)",
        "Business: Sidenote (sidenote.in)",
        "Address: Noida, Uttar Pradesh, India",
        "Email: admin.sidenote@gmail.com",
      ],
      extra: "As a sole proprietorship, Yogesh Yadav is personally responsible for all data processing activities and acts as the Data Fiduciary under the DPDP Act, 2023."
    },
    {
      id: 2,
      title: "Consent & Withdrawal",
      icon: Key,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: "We collect and process your personal data only with your prior, informed, and explicit consent. Your consent is obtained when you send your first message or complete account setup.",
      extra: "You may withdraw your consent at any time by deleting your account. Upon withdrawal, we will cease all processing and delete your data within 30 days."
    },
    {
      id: 3,
      title: "What Personal Data We Collect",
      icon: Database,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: "We collect only the minimum data necessary. We collect:",
      bullets: [
        "Your WhatsApp phone number",
        "Expense entries you type (amount, description, date, mode)",
        "IP address, browser type, and session logs for security"
      ],
      extra: "We do NOT collect bank details, SMS logs, contacts, or location data."
    },
    {
      id: 4,
      title: "Purpose of Data Collection",
      icon: Settings,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: "Your data is processed only to:",
      bullets: [
        "Provide expense tracking via WhatsApp",
        "Generate reports accessible through your dashboard",
        "Authenticate accounts and respond to support requests",
        "Maintain security and comply with Indian laws"
      ],
      extra: "We will not use your data for advertising or profiling without fresh, explicit consent."
    },
    {
      id: 5,
      title: "Third-Party Processors",
      icon: Share2,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: "We rely on secure third-party infrastructure. By using Sidenote, you consent to cross-border data transfers to:",
      bullets: [
        "Meta Platforms Inc. (WhatsApp API)",
        "Render Inc. (US-based Backend Hosting)",
        "GitHub Inc. (US-based Frontend Hosting)"
      ],
      extra: "We do not sell, rent, or share your personal data with any third party for commercial purposes."
    },
    {
      id: 6,
      title: "Data Retention",
      icon: Clock,
      color: "text-teal-500",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      content: "We retain data only as long as necessary:",
      bullets: [
        "Expense logs: Retained for the duration of your active account",
        "Account deletion: Permanent erasure of logs and phone number within 30 days",
        "Technical logs: Deleted after 90 days"
      ]
    },
    {
      id: 7,
      title: "Data Security",
      icon: ShieldAlert,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: "We implement encrypted transmission, access controls, and dashboard authentication. While we take precautions, absolute security cannot be guaranteed. In the event of a breach, we will notify you within 72 hours."
    },
    {
      id: 8,
      title: "Your Rights (DPDP Act, 2023)",
      icon: UserCog,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      content: "As a Data Principal, you have the right to:",
      bullets: [
        "Access a summary of your data (Respond within 30 days)",
        "Correct or Erase your data permanently",
        "File a grievance or nominate an individual",
        "Withdraw consent at any time",
        "Complain to the Data Protection Board of India"
      ]
    },
    {
      id: 9,
      title: "Grievance Officer",
      icon: Scale,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      content: "In accordance with Section 13 of the DPDP Act, 2023:",
      bullets: [
        "Name: Yogesh Yadav",
        "Email: admin.sidenote@gmail.com",
        "Address: Noida, Uttar Pradesh, India",
        "Resolution Time: Acknowledged in 48h, resolved within 30 days"
      ]
    },
    {
      id: 10,
      title: "Age Restriction",
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      content: "Sidenote is intended for individuals aged 18 years and above. We do not knowingly collect personal data from minors. Minors found using the service will have their accounts immediately deleted."
    },
    {
      id: 11,
      title: "Changes & Governing Law",
      icon: Globe,
      color: "text-[#25D366]",
      bg: "bg-[#25D366]/10 dark:bg-[#25D366]/20",
      content: "We will notify you of material changes via WhatsApp. This policy is governed by the laws of India (DPDP Act 2023, IT Act 2000). Disputes are subject to the jurisdiction of Noida, UP courts."
    }
  ];

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-fixed overflow-y-auto"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0 fixed"></div>

      <div className="relative z-10 max-w-4xl mx-auto pt-10 pb-12 px-4 md:px-6 animate-fade-in">
        
        <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-full font-bold transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 md:p-10 lg:p-12 border border-stone-100 dark:border-slate-800">
          
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-6 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={36} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
              This policy explains how Sidenote collects, uses, stores, and protects your personal data. Published in compliance with the Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act, 2000.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                <span className="inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Effective: {effectiveDate}
                </span>
                <span className="inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Updated: {lastUpdated}
                </span>
            </div>
          </div>

          <div className="space-y-8 md:space-y-10 max-w-3xl mx-auto">
              {sections.map((section) => (
                <div key={section.id} className="flex flex-col md:flex-row gap-4 md:gap-6 group">
                    <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${section.bg} ${section.color} transition-transform group-hover:scale-110`}>
                            <section.icon size={24} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2 flex items-center gap-2">
                          <span className="text-stone-300 dark:text-slate-700 font-mono text-sm">
                             {section.id < 10 ? `0${section.id}` : section.id}.
                          </span> 
                          {section.title}
                        </h3>
                        <p className="text-stone-600 dark:text-slate-400 leading-relaxed mb-3 text-sm md:text-base">
                            {section.content}
                        </p>
                        
                        {section.bullets && (
                          <ul className="space-y-2 mt-2 mb-3">
                              {section.bullets.map((bullet, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-stone-600 dark:text-slate-300 text-sm md:text-base">
                                      <CheckCircle2 size={16} className={`mt-0.5 flex-shrink-0 ${section.color}`} />
                                      <span>{bullet}</span>
                                  </li>
                              ))}
                          </ul>
                        )}

                        {section.extra && (
                            <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                    {section.extra}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
              ))}
          </div>

          <div className="mt-12 max-w-3xl mx-auto bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                  <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2">Still have questions?</h3>
              <p className="text-stone-500 dark:text-slate-400 mb-6">If you need to exercise your data rights or contact our Grievance Officer, we're here to help.</p>
              <Link 
                to="/feedback" 
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Contact Support
              </Link>
          </div>

        </div>

      </div>
    </div>
  );
}