import { MessageSquareText, MessageSquare } from 'lucide-react';

interface LogoProps {
  className?: string;
  textSize?: string;
  variant?: 'wordmark' | 'integrated' | 'app-icon'; 
}

export default function Logo({ 
  className = "", 
  textSize = "text-2xl", 
  variant = "wordmark" 
}: LogoProps) {
  
  if (variant === 'app-icon') {
    return (
      <div className={`flex items-center justify-center bg-[#25D366] rounded-2xl shadow-lg shadow-[#25D366]/30 shrink-0 aspect-square ${className}`} style={{ width: '2em' }}>
        <MessageSquare className="w-[55%] h-[55%] text-white fill-white/20" strokeWidth={2.5} />
      </div>
    );
  }

  if (variant === 'integrated') {
    return (
      <div className={`flex items-baseline font-extrabold tracking-tight ${className}`}>
        <span className={`text-[#111111] dark:text-white ${textSize}`}>SideNote</span>
        <div className="w-[0.2em] h-[0.2em] bg-[#25D366] rounded-full ml-[0.05em]"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-[0.3em] ${className}`}>
      <div className="flex items-center justify-center w-[1.3em] h-[1.3em] bg-[#25D366]/15 dark:bg-[#25D366]/20 rounded-[0.3em] shrink-0">
         <MessageSquareText className="w-[60%] h-[60%] text-[#25D366]" strokeWidth={2.5} />
      </div>
      
      <div className={`font-extrabold tracking-tight ${textSize}`}>
        <span className="text-[#111111] dark:text-white">Side</span>
        <span className="text-[#25D366]">Note</span>
      </div>
    </div>
  );
}