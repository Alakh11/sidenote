import { 
  FileText, Smartphone, UserCheck, Key, Shield, CreditCard, MessageCircle, 
  Database, Copyright, Activity, AlertTriangle, ShieldAlert, RefreshCw, 
  GitMerge, Power, Scale, Scissors, Mail, ArrowLeft, Info
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function TermsAndConditions() {
  const effectiveDate = "April 29, 2026";
  const lastUpdated = "April 29, 2026";

  const terms = [
    {
      id: 1,
      title: "Introduction",
      icon: Info,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: (
        <>
          These Terms and Conditions (“Terms”) constitute a legally binding agreement between you (“User”) and SideNote (“we”, “us”, or “our”), a sole proprietorship based in Noida, Uttar Pradesh, India.
          <br /><br />
          By using SideNote via WhatsApp or the web dashboard at sidenote.in, you agree to be bound by these Terms. If you do not agree, you must not use the service.
        </>
      )
    },
    {
      id: 2,
      title: "Description of Service",
      icon: Smartphone,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: (
        <>
          SideNote is a WhatsApp-based personal expense tracking tool.
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Users manually log expense data</li>
            <li>Data is accessible via a web dashboard</li>
            <li>No automatic financial data collection is performed</li>
          </ul>
          SideNote does not access bank accounts, SMS, or third-party financial systems.
        </>
      )
    },
    {
      id: 3,
      title: "Eligibility",
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: (
        <>
          You must be at least 18 years old to use the service. We reserve the right to suspend or terminate accounts that do not meet this requirement.
        </>
      )
    },
    {
      id: 4,
      title: "Account and Access",
      icon: Key,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: (
        <>
          <ul className="list-disc pl-5 space-y-1 mb-2">
            <li>Your account is linked to your WhatsApp phone number</li>
            <li>You are responsible for securing your device and WhatsApp account</li>
            <li>We are not liable for unauthorized access caused by compromised credentials</li>
          </ul>
          You may delete your account at any time. Data will be deleted within 30 days as per our Privacy Policy.
        </>
      )
    },
    {
      id: 5,
      title: "Acceptable Use",
      icon: Shield,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: (
        <>
          You agree to use SideNote only for lawful personal purposes. You must not:
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Record data of others without consent</li>
            <li>Attempt to disrupt or reverse-engineer the system</li>
            <li>Use automation without permission</li>
            <li>Transmit harmful or fraudulent content</li>
            <li>Use the service for unauthorized commercial purposes</li>
          </ul>
          We may suspend or terminate access for violations.
        </>
      )
    },
    {
      id: 6,
      title: "Pricing and Payments",
      icon: CreditCard,
      color: "text-teal-500",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      content: (
        <>
          SideNote may operate on a freemium model.
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Core features may be free</li>
            <li>Premium features may be introduced</li>
          </ul>
          You will not be charged without explicit consent. All pricing and payment terms will be clearly communicated before any charge is applied.
        </>
      )
    },
    {
      id: 7,
      title: "Platform Dependency (WhatsApp)",
      icon: MessageCircle,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      content: (
        <>
          SideNote depends on WhatsApp Business API. We are not responsible for:
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>WhatsApp outages</li>
            <li>API changes</li>
            <li>Policy restrictions by Meta</li>
          </ul>
          If WhatsApp access is disrupted, we may provide alternative access where feasible.
        </>
      )
    },
    {
      id: 8,
      title: "Data and Ownership",
      icon: Database,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      content: (
        <>
          You retain ownership of all data you enter. We process your data solely to provide the service, as described in our Privacy Policy.
        </>
      )
    },
    {
      id: 9,
      title: "Intellectual Property",
      icon: Copyright,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: (
        <>
          All rights related to SideNote—including software, design, and branding—are owned by SideNote. You are granted a limited, non-exclusive, non-transferable license for personal use only. You may not copy, modify, distribute, or reverse-engineer any part of the service.
        </>
      )
    },
    {
      id: 10,
      title: "Service Availability",
      icon: Activity,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      content: (
        <>
          We aim to provide reliable service but do not guarantee uninterrupted access or error-free operation. Interruptions may occur due to:
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Maintenance</li>
            <li>Infrastructure issues</li>
            <li>Third-party service failures</li>
          </ul>
          We are not liable for such interruptions.
        </>
      )
    },
    {
      id: 11,
      title: "Limitation of Liability",
      icon: AlertTriangle,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      content: (
        <>
          To the maximum extent permitted by law:
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>SideNote is not a financial advisor</li>
            <li>We are not responsible for decisions based on your data</li>
            <li>We are not liable for errors in user-entered data</li>
          </ul>
          Our total liability is limited to the amount paid in the last 3 months (or zero for free users). We are not liable for indirect or consequential damages.
        </>
      )
    },
    {
      id: 12,
      title: "Indemnification",
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      content: (
        <>
          You agree to indemnify SideNote against any claims arising from:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Misuse of the service</li>
            <li>Violation of these Terms</li>
            <li>Infringement of third-party rights</li>
          </ul>
        </>
      )
    },
    {
      id: 13,
      title: "Changes to Terms",
      icon: RefreshCw,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      content: (
        <>
          We may update these Terms.
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Material changes → prior notice</li>
            <li>Continued use → acceptance</li>
          </ul>
          If you do not agree, you must stop using the service.
        </>
      )
    },
    {
      id: 14,
      title: "Assignment",
      icon: GitMerge,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      content: (
        <>
          We may transfer these Terms in case of:
          <ul className="list-disc pl-5 mt-2 mb-2 space-y-1">
            <li>Acquisition</li>
            <li>Merger</li>
            <li>Restructuring</li>
          </ul>
          You may not transfer your rights without consent.
        </>
      )
    },
    {
      id: 15,
      title: "Termination",
      icon: Power,
      color: "text-stone-500",
      bg: "bg-stone-100 dark:bg-slate-800",
      content: (
        <>
          You may terminate your account at any time. We may suspend or terminate access if Terms are violated or the service becomes unlawful. Upon termination:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Access ends immediately</li>
            <li>Data is deleted within 30 days</li>
          </ul>
        </>
      )
    },
    {
      id: 16,
      title: "Dispute Resolution",
      icon: Scale,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      content: (
        <>
          You agree to first contact us for resolution. Unresolved disputes will be subject to Jurisdiction: Noida, Uttar Pradesh, India.
        </>
      )
    },
    {
      id: 17,
      title: "Severability",
      icon: Scissors,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      content: (
        <>
          If any clause is invalid, the remaining Terms remain enforceable.
        </>
      )
    },
    {
      id: 18,
      title: "Entire Agreement",
      icon: FileText,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      content: (
        <>
          These Terms + Privacy Policy form the complete agreement.
        </>
      )
    },
    {
      id: 19,
      title: "Contact",
      icon: Mail,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      content: (
        <>
          For any queries:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Email: admin.sidenote@gmail.com</li>
            <li>Address: Noida, Uttar Pradesh, India</li>
          </ul>
        </>
      )
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
            className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-full font-bold transition-all shadow-lg mb-8"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-6 md:p-8 lg:p-10 border border-stone-100 dark:border-slate-800">
          
          {/* Header Section */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4 text-indigo-600 dark:text-indigo-400">
                <FileText size={28} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-stone-800 dark:text-white mb-3 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-stone-500 dark:text-slate-400 text-xs md:text-sm max-w-xl mx-auto">
              By using SideNote, you agree to the following terms and operating policies.
            </p>
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
              {terms.map((term) => (
                <div key={term.id} className="flex flex-row gap-3 md:gap-4 group">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${term.bg} ${term.color} transition-transform group-hover:scale-110`}>
                            <term.icon className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 dark:text-white mb-1 flex items-center gap-2">
                          <span className="text-stone-300 dark:text-slate-700 font-mono text-xs">
                            {term.id < 10 ? `0${term.id}` : term.id}.
                          </span> 
                          {term.title}
                        </h3>
                        <div className="text-stone-500 dark:text-slate-400 leading-relaxed text-xs">
                            {term.content}
                        </div>
                    </div>
                </div>
              ))}
          </div>

          {/* Support / Feedback Section */}
          <div className="mt-10 max-w-3xl mx-auto bg-stone-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-stone-100 dark:border-slate-800 text-center flex flex-col items-center">
              <h3 className="text-sm font-bold text-stone-800 dark:text-white mb-1">Have questions about our terms?</h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">If something isn't clear, we're happy to help you understand how we operate.</p>
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