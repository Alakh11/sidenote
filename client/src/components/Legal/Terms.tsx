import { 
  FileText, Smartphone, UserCheck, ShieldAlert, Activity, 
  Database, AlertTriangle, Power, RefreshCw, MessageCircle, ArrowLeft 
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

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
            <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-6 text-indigo-600 dark:text-indigo-400">
                <FileText size={36} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              By using SideNote, you agree to the following terms and operating policies.
            </p>
            <div className="mt-6 inline-block px-4 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              Effective Date: {lastUpdated}
            </div>
          </div>

          {/* Terms Grid/List */}
          <div className="space-y-8 max-w-3xl mx-auto">
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
                        <p className="text-stone-600 dark:text-slate-300 leading-relaxed">
                            {term.content}
                        </p>
                    </div>
                </div>
              ))}
          </div>

          {/* Support / Feedback Section */}
          <div className="mt-12 max-w-3xl mx-auto bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                  <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2">Have questions about our terms?</h3>
              <p className="text-stone-500 dark:text-slate-400 mb-6">If something isn't clear, we're happy to help you understand how we operate.</p>
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