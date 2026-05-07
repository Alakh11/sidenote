import { Loader2 } from 'lucide-react';

export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F3F4F6] dark:bg-slate-950 animate-in fade-in duration-300">
      
      <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 zoom-in-95 fade-in duration-500">
        
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#25D366] to-[#1EA952] rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/30 animate-pulse">
                 <span className="text-white font-extrabold text-2xl tracking-tighter">S</span>
            </div>
            <span className="font-extrabold tracking-tight text-4xl text-[#111111] dark:text-white leading-none">
                Side<span className="text-[#25D366]">Note</span>
            </span>
        </div>
        
        <div className="flex items-center gap-3 text-stone-500 dark:text-slate-400 font-bold text-sm bg-white dark:bg-slate-900 px-5 py-2.5 rounded-full shadow-sm border border-stone-100 dark:border-slate-800">
           <Loader2 className="w-4 h-4 animate-spin text-[#25D366]" />
           <span>Loading...</span>
        </div>

      </div>

    </div>
  );
}