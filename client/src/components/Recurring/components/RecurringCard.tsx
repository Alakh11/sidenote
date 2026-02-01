import { Trash2, ArrowRight, Loader2, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  tx: any;
  onPay: (tx: any) => void;
  onStop: (id: number) => void;
  isProcessing: boolean;
}

export default function RecurringCard({ tx, onPay, onStop, isProcessing }: Props) {
  
  // Helper: Format "Last Paid" text
  const getLastPaidText = (dateString: string | null) => {
    if (!dateString) return "Not paid yet";
    
    const paidDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - paidDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays === 0 || diffDays === 1) return "Paid Today";
    if (diffDays === 2) return "Paid Yesterday";
    if (diffDays <= 30) return `Paid ${diffDays - 1} days ago`;
    
    return `Last: ${paidDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  const lastPaidText = getLastPaidText(tx.last_paid);
  const isPaidRecently = lastPaidText.includes("Today") || lastPaidText.includes("Yesterday") || (tx.last_paid && new Date(tx.last_paid).getMonth() === new Date().getMonth());

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-stone-100 dark:border-slate-800 relative overflow-hidden group hover:shadow-md transition-all duration-300">
        
        {/* Decorative Circle */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-stone-50 dark:bg-slate-800 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>

        <div className="relative z-10 flex flex-col h-full justify-between">
            
            {/* Top: Icon & Delete */}
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-stone-50 dark:bg-slate-800 rounded-xl text-2xl border border-stone-100 dark:border-slate-700">
                        {tx.category_icon || tx.category?.charAt(0) || 'R'}
                    </div>
                    <button 
                        onClick={() => onStop(tx.id)} 
                        className="text-stone-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                        title="Stop Recurring"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-stone-800 dark:text-white leading-tight mb-1">
                    {tx.note || 'Subscription'}
                </h3>
                <p className="text-stone-400 dark:text-slate-500 text-sm font-bold uppercase tracking-wide">
                    {tx.category}
                </p>
            </div>

            {/* Middle: Amount & Last Paid Status */}
            <div className="mt-6 mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-stone-800 dark:text-white">
                        ₹{Number(tx.amount).toLocaleString()}
                    </span>
                    <span className="text-stone-400 dark:text-slate-500 font-medium text-sm">/mo</span>
                </div>
                
                {/* LAST PAID INDICATOR */}
                <div className={`flex items-center gap-2 mt-3 text-xs font-bold px-3 py-1.5 rounded-lg w-fit transition-colors ${
                    isPaidRecently 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-stone-50 text-stone-400 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                    {isPaidRecently ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{lastPaidText}</span>
                </div>
            </div>

            {/* Bottom: Action Button */}
            <button 
                onClick={() => onPay(tx)}
                disabled={isProcessing}
                className={`w-full py-3.5 rounded-xl font-bold active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                    isPaidRecently 
                    ? 'bg-white border-2 border-stone-100 text-stone-400 hover:bg-stone-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800' 
                    : 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                }`}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                    </>
                ) : isPaidRecently ? (
                    <>
                        Pay Again <ArrowRight className="w-4 h-4" />
                    </>
                ) : (
                    <>
                        Mark Paid <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    </div>
  );
}