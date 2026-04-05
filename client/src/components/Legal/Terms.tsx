import { 
  FileText, Smartphone, UserCheck, ShieldAlert, Activity, 
  Database, AlertTriangle, Power, RefreshCw, MessageCircle
} from 'lucide-react';

export default function TermsAndConditions() {
  const lastUpdated = "April 5, 2026";

  const terms = [
    {
      id: 1,
      title: "Service Description",
      icon: Smartphone,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: "SideNote is a WhatsApp-based tool that allows you to note daily entries and view summaries."
    },
    {
      id: 2,
      title: "User Responsibility",
      icon: UserCheck,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: "You are responsible for the messages you send and ensuring the accuracy of your entries."
    },
    {
      id: 3,
      title: "No Financial Advice",
      icon: ShieldAlert,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: "SideNote does not provide financial, investment, or professional advice. It only stores and displays user-provided data."
    },
    {
      id: 4,
      title: "Availability",
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: "We aim to provide a reliable service but do not guarantee uninterrupted availability."
    },
    {
      id: 5,
      title: "Data Usage",
      icon: Database,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: "By using SideNote, you agree that your messages may be stored and processed to generate summaries and insights."
    },
    {
      id: 6,
      title: "Limitation of Liability",
      icon: AlertTriangle,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: "SideNote is provided “as is”. We are not responsible for data loss, incorrect user entries, or any decisions made based on the data."
    },
    {
      id: 7,
      title: "Termination",
      icon: Power,
      color: "text-stone-500",
      bg: "bg-stone-100 dark:bg-slate-800",
      content: "You can stop using the service anytime. We may suspend access if misuse is detected."
    },
    {
      id: 8,
      title: "Changes",
      icon: RefreshCw,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      content: "We may update these terms from time to time to reflect changes in our service or legal requirements."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="mb-10 text-center md:text-left">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4 text-indigo-600 dark:text-indigo-400">
            <FileText size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-stone-500 dark:text-slate-400 text-lg">
          By using SideNote, you agree to the following terms.
        </p>
        <div className="mt-4 inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
          Effective Date: {lastUpdated}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-6 md:p-10 space-y-8">
            {terms.map((term) => (
              <div key={term.id} className="flex flex-col md:flex-row gap-4 md:gap-6 group">
                  <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${term.bg} ${term.color} transition-transform group-hover:scale-110`}>
                          <term.icon size={24} />
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2 flex items-center gap-2">
                        <span className="text-stone-300 dark:text-slate-700 font-mono text-sm">0{term.id}.</span> 
                        {term.title}
                      </h3>
                      <p className="text-stone-600 dark:text-slate-400 leading-relaxed">
                          {term.content}
                      </p>
                  </div>
              </div>
            ))}
        </div>

        {/* Footer / Contact Section */}
        <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
              <MessageCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2">Still have questions?</h3>
          <p className="text-stone-500 dark:text-slate-400 mb-6">Can't find the answer you're looking for? We're here to help.</p>
          <a 
            href="/feedback" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Contact Support
          </a>
      </div>

      </div>
    </div>
  );
}