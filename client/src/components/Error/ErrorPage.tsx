import { Link } from '@tanstack/react-router';
import { 
  AlertTriangle, 
  FileQuestion, 
  FileX, 
  ServerCrash, 
  CloudOff, 
  Construction, 
  ArrowLeft, 
  RefreshCw,
  Home,
  ShieldAlert,
  Clock
} from 'lucide-react';

interface ErrorPageProps {
  code?: 400 | 403 | 404 | 410 | 429 | 500 | 502 | 503;
  customMessage?: string;
  onRetry?: () => void;
}

export default function ErrorPage({ code = 404, customMessage, onRetry }: ErrorPageProps) {
  
  // Configuration for each error code
  const errorConfig = {
    400: {
      title: "Bad Request",
      message: "Something went wrong with your request. Please check your input and try again.",
      icon: AlertTriangle,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20"
    },
    403: {
      title: "Access Restricted",
      message: "SideNote is currently restricted in your region or country due to regional policy limits.",
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    },
    404: {
      title: "Page Not Found",
      message: "We couldn't find the page you're looking for. It might have been moved or deleted.",
      icon: FileQuestion,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20"
    },
    410: {
      title: "Content Gone",
      message: "The resource you are looking for has been permanently removed.",
      icon: FileX,
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    },
    429: {
      title: "Too Many Requests",
      message: "You have sent too many requests in a short time. Please wait a moment and try again.",
      icon: Clock,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20"
    },
    500: {
      title: "Server Error",
      message: "Our servers are having a hard time. We've been notified and are fixing it.",
      icon: ServerCrash,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    },
    502: {
      title: "Bad Gateway",
      message: "We received an invalid response from the upstream server. Please try again later.",
      icon: CloudOff,
      color: "text-indigo-500 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    503: {
      title: "Under Maintenance",
      message: "We are currently performing maintenance. SideNote will be back shortly.",
      icon: Construction,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-900/20"
    }
  };

  const config = errorConfig[code] || errorConfig[500];
  const Icon = config.icon;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 text-center animate-fade-in-up">
        
        {/* Icon Bubble */}
        <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${config.bg} ${config.color} shadow-sm transition-colors`}>
          <Icon className="w-10 h-10" />
        </div>

        {/* Error Code */}
        <p className="text-sm font-black tracking-widest text-stone-300 dark:text-slate-600 uppercase mb-2">
          Error {code}
        </p>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-stone-800 dark:text-white mb-3">
          {config.title}
        </h1>

        {/* Message */}
        <p className="text-stone-500 dark:text-slate-400 font-medium mb-8 leading-relaxed text-sm md:text-base">
          {customMessage || config.message}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Retry Button (For 500s, 429s or if handler provided, but NOT for 403 Geo Block) */}
          {(code >= 500 || code === 429 || onRetry) && code !== 403 && (
            <button 
              onClick={onRetry || (() => window.location.reload())}
              className="w-full py-3.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 font-bold flex items-center justify-center gap-2 hover:bg-stone-200 dark:hover:bg-slate-700 transition text-sm md:text-base"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          )}

          {/* Go Home Button */}
          {code !== 403 ? (
            <Link 
              to="/dashboard" 
              className="w-full py-3.5 rounded-xl bg-stone-900 dark:bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-[#1EA952] transition shadow-lg shadow-stone-200 dark:shadow-[#25D366]/20 text-sm md:text-base"
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </Link>
          ) : (
            <p className="text-xs font-semibold text-stone-400 dark:text-slate-500">
              If you believe this is an error, please contact support.
            </p>
          )}

          {code === 404 && (
            <button 
              onClick={() => window.history.back()}
              className="mt-2 text-sm font-bold text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}