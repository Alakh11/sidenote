import { 
  ShieldCheck, Database, Settings, HardDrive, 
  Share2, Clock, UserCog, CheckCircle2, ArrowLeft,
  Scale, Key, Globe, ShieldAlert, FileText, Mail,RefreshCw
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function PrivacyPolicy() {
  const effectiveDate = "April 29, 2026";
  const lastUpdated = "April 29, 2026";

  const sections = [
    {
      id: 1,
      title: "Introduction",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: "This Privacy Policy explains how SideNote (“we”, “us”, or “our”) collects, uses, stores, and protects your personal data when you use our WhatsApp-based expense tracking service and web dashboard available at sidenote.in.",
      extra: "This policy is provided in accordance with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000. By using SideNote, you agree to the practices described in this policy."
    },
    {
      id: 2,
      title: "Identity of Data Fiduciary",
      icon: ShieldCheck,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: "SideNote operates as a sole proprietorship and acts as the Data Fiduciary under applicable law.",
      bullets: [
        "Business Name: SideNote",
        "Email: legal@sidenote.in",
        "Address: Noida, Uttar Pradesh, India"
      ]
    },
    {
      id: 3,
      title: "Consent & Withdrawal",
      icon: Key,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: "We collect and process your personal data based on your consent, obtained when you send messages to the WhatsApp service or use the dashboard.",
      bullets: [
        "You may withdraw consent at any time by deleting your account",
        "Processing will stop upon withdrawal",
        "Data will be deleted within 30 days, unless required by law"
      ],
      extra: "Withdrawal does not affect prior lawful processing."
    },
    {
      id: 4,
      title: "Data We Collect",
      icon: Database,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: "We collect only the minimum data required to provide our service.",
      bullets: [
        "Provided: WhatsApp phone number and Expense entries",
        "Automated: IP address, browser details, session logs, timestamps",
        "NOT Collected: Bank accounts, SMS logs, Contacts, Location"
      ]
    },
    {
      id: 5,
      title: "Purpose of Data Use",
      icon: Settings,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: "Your data is used only for recording entries, generating summaries, providing dashboard access, support, security, and legal compliance.",
      extra: "We do not sell your data or use it for advertising."
    },
    {
      id: 6,
      title: "Third-Party Services & Transfers",
      icon: Share2,
      color: "text-teal-500",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      content: "Your data may be processed and stored outside India, including in the United States. By using SideNote, you consent to such transfers to:",
      bullets: [
        "WhatsApp / Meta Platforms Inc.",
        "Render Inc. (Backend Hosting - US)",
        "GitHub Inc. (Frontend Hosting - US)"
      ]
    },
    {
      id: 7,
      title: "Data Retention",
      icon: Clock,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      content: "Data retention schedules:",
      bullets: [
        "Account data: retained while your account is active",
        "After account deletion: deleted within 30 days",
        "Technical logs: retained for up to 90 days"
      ]
    },
    {
      id: 8,
      title: "Data Security",
      icon: HardDrive,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: "We implement reasonable safeguards, including encrypted transmission, access controls, and secure infrastructure.",
      extra: "No system is completely secure. In case of a data breach, we will notify affected users within 72 hours, as required by law."
    },
    {
      id: 9,
      title: "Your Rights",
      icon: UserCog,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      content: "Under applicable law, you have the right to:",
      bullets: [
        "Access your personal data",
        "Correct or update inaccurate data",
        "Request deletion of your data",
        "Withdraw consent",
        "File a grievance via email"
      ]
    },
    {
      id: 10,
      title: "Grievance Redressal",
      icon: Scale,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      content: "For complaints or concerns:",
      bullets: [
        "Email: legal@sidenote.in",
        "Response time: within 48 hours",
        "Resolution time: within 30 days"
      ]
    },
    {
      id: 11,
      title: "Age Restriction",
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      content: "SideNote is intended for users aged 18 years and above. If we become aware that a minor has used the service, their data will be deleted."
    },
    {
      id: 12,
      title: "Changes to This Policy",
      icon: RefreshCw,
      color: "text-[#25D366]",
      bg: "bg-[#25D366]/10 dark:bg-[#25D366]/20",
      content: "We may update this Privacy Policy from time to time.",
      bullets: [
        "Material changes → prior notice",
        "Continued use → acceptance"
      ]
    },
    {
      id: 13,
      title: "Governing Law",
      icon: Globe,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: "This policy is governed by the laws of India. Jurisdiction: Noida, Uttar Pradesh, India."
    },
    {
      id: 14,
      title: "Contact",
      icon: Mail,
      color: "text-stone-500",
      bg: "bg-stone-100 dark:bg-slate-800",
      content: "For any questions:",
      bullets: [
        "Email: legal@sidenote.in",
        "Address: Noida, Uttar Pradesh, India"
      ]
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
            className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-full font-bold transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-6 md:p-8 lg:p-10 border border-stone-100 dark:border-slate-800">
          
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-4 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={28} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-stone-800 dark:text-white mb-3 tracking-tight">
              Privacy Policy
            </h1>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                <span className="inline-block px-3 py-1 bg-stone-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Effective: {effectiveDate}
                </span>
                <span className="inline-block px-3 py-1 bg-stone-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
                  Updated: {lastUpdated}
                </span>
            </div>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
              {sections.map((section) => (
                <div key={section.id} className="flex flex-row gap-3 md:gap-4 group">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${section.bg} ${section.color} transition-transform group-hover:scale-110`}>
                            <section.icon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-stone-300 dark:text-slate-700 font-mono text-xs">
                             {section.id < 10 ? `0${section.id}` : section.id}.
                          </span> 
                          {section.title}
                        </h3>
                        <p className="text-stone-500 dark:text-slate-400 leading-relaxed mb-1.5 text-xs">
                            {section.content}
                        </p>
                        
                        {section.bullets && (
                          <ul className="space-y-1 mb-2">
                              {section.bullets.map((bullet, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-stone-500 dark:text-slate-400 text-xs">
                                      <CheckCircle2 size={12} className={`mt-0.5 flex-shrink-0 ${section.color}`} />
                                      <span>{bullet}</span>
                                  </li>
                              ))}
                          </ul>
                        )}

                        {section.extra && (
                            <div className="mt-2 p-2.5 bg-stone-50 dark:bg-slate-800/50 rounded-lg border border-stone-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-medium text-stone-500 dark:text-slate-400">
                                    {section.extra}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
              ))}
          </div>

          <div className="mt-10 max-w-3xl mx-auto bg-stone-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-stone-100 dark:border-slate-800 text-center flex flex-col items-center">
              <h3 className="text-sm font-bold text-stone-800 dark:text-white mb-1">Still have questions?</h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">Contact our Grievance Officer.</p>
              <Link 
                to="/feedback" 
                className="px-4 py-2 bg-stone-800 text-white dark:bg-white dark:text-stone-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Contact Support
              </Link>
          </div>

        </div>

      </div>
    </div>
  );
}