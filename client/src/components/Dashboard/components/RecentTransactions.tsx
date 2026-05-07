import { 
  CreditCard, Calendar, Wallet, Smartphone, Banknote, Globe, ArrowUpRight, ArrowDownLeft, Activity
} from 'lucide-react';
import type { Transaction } from '../../../types';

const getModeStyles = (mode: string) => {
  const normalizedMode = mode?.toLowerCase() || '';

  if (normalizedMode.includes('upi')) {
    return { 
      bg: 'bg-indigo-100 dark:bg-indigo-900/50', 
      text: 'text-indigo-600 dark:text-indigo-400', 
      icon: <Smartphone className="w-5 h-5" /> 
    };
  }
  if (normalizedMode.includes('cash')) {
    return { 
      bg: 'bg-emerald-100 dark:bg-emerald-900/50', 
      text: 'text-emerald-600 dark:text-emerald-400', 
      icon: <Banknote className="w-5 h-5" /> 
    };
  }
  if (normalizedMode.includes('net') || normalizedMode.includes('banking')) {
    return { 
      bg: 'bg-sky-100 dark:bg-sky-900/50', 
      text: 'text-sky-600 dark:text-sky-400', 
      icon: <Globe className="w-5 h-5" /> 
    };
  }
  return { 
    bg: 'bg-orange-100 dark:bg-orange-900/50', 
    text: 'text-orange-600 dark:text-orange-400', 
    icon: <CreditCard className="w-5 h-5" /> 
  };
};

export default function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const displayTransactions = transactions.slice(0, 7);

  return (
    <div className="lg:col-span-2">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-stone-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        
        <div className="px-6 py-5 border-b border-stone-50 dark:border-slate-800/80 bg-stone-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-stone-800 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Activity className="w-5 h-5 text-indigo-500" /> 
            Recent Transactions
          </h2>
        </div>

        <div className="divide-y divide-stone-50 dark:divide-slate-800/60">
          {displayTransactions.map((tx: Transaction) => {
            const styles = getModeStyles(tx.payment_mode);
            const isIncome = tx.type === 'income';

            const formattedDate = new Date(tx.date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            });

            return (
              <div key={tx.id} className="flex items-center justify-between p-5 hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-all duration-200 group cursor-default">
                
                <div className="flex items-center gap-4 flex-[2] min-w-0">
                  <div className={`p-3 rounded-2xl ${styles.bg} ${styles.text} shadow-sm group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                     {styles.icon}
                  </div>

                  <div className="min-w-0 truncate pr-4">
                    <p className="font-bold text-stone-800 dark:text-slate-100 text-[15px] leading-tight truncate capitalize">
                      {tx.note || 'Untitled Transaction'}
                    </p>
                    
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex flex-[1.5] items-center justify-start px-2">
                  <span className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-[11px] font-bold tracking-wide border border-stone-200/60 dark:border-slate-700/60 truncate max-w-full">
                    {tx.category || 'General'}
                  </span>
                </div>

                <div className="flex flex-1 justify-end pl-2 shrink-0">
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-base shadow-sm ${
                        isIncome 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30'
                    }`}>
                        {isIncome ? <ArrowDownLeft className="w-4 h-4" strokeWidth={3} /> : <ArrowUpRight className="w-4 h-4" strokeWidth={3} />}
                        <span>₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                    </div>
                </div>

              </div>
            );
          })}
          
          {transactions.length === 0 && (
            <div className="text-center py-16 text-stone-400 dark:text-slate-500 flex flex-col items-center bg-stone-50/30 dark:bg-slate-900/30">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full mb-4 shadow-sm border border-stone-100 dark:border-slate-700">
                  <Wallet className="w-6 h-6 text-stone-300 dark:text-slate-500" />
              </div>
              <p className="font-bold text-sm tracking-wide">No transactions yet</p>
              <p className="text-xs mt-1 opacity-70">Your recent activity will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}