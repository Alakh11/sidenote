import { 
  ShieldCheck, Database, Settings, HardDrive, 
  Share2, Clock, UserCog, MessageCircle, CheckCircle2, ArrowLeft 
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function PrivacyPolicy() {
  const lastUpdated = "April 5, 2026";

  const sections = [
    {
      id: 1,
      title: "Information We Collect",
      icon: Database,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: "We collect and store:",
      bullets: [
        "Messages you send to SideNote (e.g., “200 chai”)",
        "Your phone number",
        "Timestamps of your activity"
      ]
    },
    {
      id: 2,
      title: "How We Use Your Information",
      icon: Settings,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: "We use your data to:",
      bullets: [
        "Store your notes",
        "Generate summaries and overviews",
        "Improve the functionality of SideNote"
      ],
      extra: "We do NOT use your data for advertising or sell your data to third parties."
    },
    {
      id: 3,
      title: "Data Storage",
      icon: HardDrive,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: "Your data is stored securely in our systems. We take reasonable measures to protect it from unauthorized access."
    },
    {
      id: 4,
      title: "Data Sharing",
      icon: Share2,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: "We do not share your personal data with third parties, except:",
      bullets: [
        "When required by law",
        "To comply with legal obligations"
      ]
    },
    {
      id: 5,
      title: "Data Retention",
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: "Your data is stored as long as you continue to use the service. You may request deletion at any time."
    },
    {
      id: 6,
      title: "Your Rights",
      icon: UserCog,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: "You have the right to control your data. You can:",
      bullets: [
        "Request full deletion of your data",
        "Stop using the service at any time"
      ]
    },
    {
      id: 7,
      title: "Third-Party Services",
      icon: MessageCircle,
      color: "text-[#25D366]", // WhatsApp Green
      bg: "bg-[#25D366]/10 dark:bg-[#25D366]/20",
      content: "SideNote operates via WhatsApp. Your use of WhatsApp is also governed by WhatsApp’s own privacy policy and terms of service."
    }
  ];

  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-fixed overflow-y-auto"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}
    >
      {/* Background Dark Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0 fixed"></div>

      {/* Main Scrollable Container */}
      <div className="relative z-10 max-w-4xl mx-auto pt-10 pb-12 px-4 md:px-6 animate-fade-in">
        
        {/* Floating Back Button */}
        <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-full font-bold transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={18} /> Back to Home
        </Link>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 md:p-10 lg:p-12 border border-stone-100 dark:border-slate-800">
          
          {/* Header Section */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-6 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={36} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              SideNote provides a WhatsApp-based tool that allows users to note daily entries by sending messages.
            </p>
            <div className="mt-6 inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              Effective Date: {lastUpdated}
            </div>
          </div>

          {/* Privacy Sections */}
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
                          <span className="text-stone-300 dark:text-slate-700 font-mono text-sm">0{section.id}.</span> 
                          {section.title}
                        </h3>
                        <p className="text-stone-600 dark:text-slate-400 leading-relaxed mb-3">
                            {section.content}
                        </p>
                        
                        {/* Render Bullets if they exist */}
                        {section.bullets && (
                          <ul className="space-y-2 mt-2 mb-3">
                              {section.bullets.map((bullet, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-stone-600 dark:text-slate-300">
                                      <CheckCircle2 size={16} className={`mt-0.5 flex-shrink-0 ${section.color}`} />
                                      <span>{bullet}</span>
                                  </li>
                              ))}
                          </ul>
                        )}

                        {/* Render Extra highlighted text */}
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

          {/* Support / Feedback Section */}
          <div className="mt-12 max-w-3xl mx-auto bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                  <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2">Still have questions?</h3>
              <p className="text-stone-500 dark:text-slate-400 mb-6">Can't find the answer you're looking for or have a privacy concern? We're here to help.</p>
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