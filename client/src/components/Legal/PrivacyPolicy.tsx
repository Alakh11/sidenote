import { 
  ShieldCheck, Database, Settings, HardDrive, 
  Share2, Clock, UserCog, MessageCircle, Mail, CheckCircle2 
} from 'lucide-react';

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
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="mb-10 text-center md:text-left">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl mb-4 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-stone-500 dark:text-slate-400 text-lg">
          SideNote (“we”, “our”, “us”) provides a WhatsApp-based tool that allows users to note daily entries by sending messages.
        </p>
        <div className="mt-4 inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
          Effective Date: {lastUpdated}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-6 md:p-10 space-y-8 md:space-y-10">
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

                      {/* Render Extra highlighted text (like the "We do NOT sell data" clause) */}
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

        {/* Footer / Contact Section */}
        <div className="bg-stone-50 dark:bg-slate-950 p-6 md:p-10 border-t border-stone-100 dark:border-slate-800 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h4 className="text-lg font-bold text-stone-800 dark:text-white mb-1">Questions about your privacy?</h4>
                <p className="text-stone-500 dark:text-slate-400 text-sm">If you have any questions or wish to exercise your data rights, please contact us.</p>
            </div>
            <a 
              href="mailto:support@sidenote.in" 
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-700 dark:text-white hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-400 transition-colors shadow-sm whitespace-nowrap"
            >
                <Mail size={18} /> Email Privacy Team
            </a>
        </div>

      </div>
    </div>
  );
}