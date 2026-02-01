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
  Home
} from 'lucide-react';

interface ErrorPageProps {
  code?: 400 | 404 | 410 | 500 | 502 | 503;
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
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    404: {
      title: "Page Not Found",
      message: "We couldn't find the page you're looking for. It might have been moved or deleted.",
      icon: FileQuestion,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    410: {
      title: "Content Gone",
      message: "The resource you are looking for has been permanently removed.",
      icon: FileX,
      color: "text-rose-500",
      bg: "bg-rose-50"
    },
    500: {
      title: "Server Error",
      message: "Our servers are having a hard time. We've been notified and are fixing it.",
      icon: ServerCrash,
      color: "text-rose-600",
      bg: "bg-rose-50"
    },
    502: {
      title: "Bad Gateway",
      message: "We received an invalid response from the upstream server. Please try again later.",
      icon: CloudOff,
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    },
    503: {
      title: "Under Maintenance",
      message: "We are currently performing maintenance. FinTrack will be back shortly.",
      icon: Construction,
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    }
  };

  const config = errorConfig[code] || errorConfig[500];
  const Icon = config.icon;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white text-center animate-fade-in-up">
        
        {/* Icon Bubble */}
        <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${config.bg} ${config.color} shadow-sm`}>
          <Icon className="w-10 h-10" />
        </div>

        {/* Error Code */}
        <p className="text-sm font-black tracking-widest text-stone-300 uppercase mb-2">
          Error {code}
        </p>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-stone-800 mb-3">
          {config.title}
        </h1>

        {/* Message */}
        <p className="text-stone-500 font-medium mb-8 leading-relaxed">
          {customMessage || config.message}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Retry Button (Only for 500s or if handler provided) */}
          {(code >= 500 || onRetry) && (
            <button 
              onClick={onRetry || (() => window.location.reload())}
              className="w-full py-3.5 rounded-xl bg-stone-100 text-stone-700 font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          )}

          {/* Go Home Button */}
          <Link 
            to="/dashboard" 
            className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition shadow-lg shadow-stone-200"
          >
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>

          {code === 404 && (
            <button 
              onClick={() => window.history.back()}
              className="mt-2 text-sm font-bold text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}