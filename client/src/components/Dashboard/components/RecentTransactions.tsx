import { 
  CreditCard, Calendar, Wallet, Smartphone, Banknote, Globe, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import type { Transaction } from '../../../types';

const getModeStyles = (mode: string) => {
  const normalizedMode = mode?.toLowerCase() || '';

  if (normalizedMode.includes('upi')) {
    return { 
      bg: 'bg-indigo-100 dark:bg-indigo-900/50', 
      text: 'text-indigo-600 dark:text-indigo-300', 
      icon: <Smartphone className="w-6 h-6" /> 
    };
  }
  if (normalizedMode.includes('cash')) {
    return { 
      bg: 'bg-emerald-100 dark:bg-emerald-900/50', 
      text: 'text-emerald-600 dark:text-emerald-300', 
      icon: <Banknote className="w-6 h-6" /> 
    };
  }
  if (normalizedMode.includes('net') || normalizedMode.includes('banking')) {
    return { 
      bg: 'bg-sky-100 dark:bg-sky-900/50', 
      text: 'text-sky-600 dark:text-sky-300', 
      icon: <Globe className="w-6 h-6" /> 
    };
  }
  return { 
    bg: 'bg-orange-100 dark:bg-orange-900/50', 
    text: 'text-orange-600 dark:text-orange-300', 
    icon: <CreditCard className="w-6 h-6" /> 
  };
};

export default function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="lg:col-span-2">
      <div className="flex justify-between items-end mb-4 px-2">
        <h2 className="text-xl font-bold text-stone-800 dark:text-white">Recent Transactions</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="divide-y divide-stone-50 dark:divide-slate-800">
          {transactions.map((tx: Transaction) => {
            const styles = getModeStyles(tx.payment_mode);
            const isIncome = tx.type === 'income';

            return (
              <div key={tx.id} className="flex justify-between items-center p-5 hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-default">
                <div className="flex items-center gap-4">
                  
                  <div className={`p-3.5 rounded-2xl ${styles.bg} ${styles.text} shadow-sm group-hover:scale-105 transition-transform`}>
                     {styles.icon}
                  </div>

                  <div>
                    <p className="font-bold text-stone-800 dark:text-slate-100 text-lg leading-tight">{tx.category || 'General'}</p>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-xs font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wide">
                        <Calendar className="w-3 h-3" />
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
                      
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${styles.bg} ${styles.text} opacity-80`}>
                        {tx.payment_mode}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col items-end`}>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-xl font-black text-lg ${
                        isIncome 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                        {isIncome ? <ArrowDownLeft className="w-4 h-4" strokeWidth={3} /> : <ArrowUpRight className="w-4 h-4" strokeWidth={3} />}
                        <span>₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                    </div>
                </div>
              </div>
            );
          })}
          
          {transactions.length === 0 && (
            <div className="text-center py-12 text-stone-400 dark:text-slate-600 flex flex-col items-center">
              <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-full mb-3 shadow-sm border border-stone-100 dark:border-slate-700">
                  <Wallet className="w-6 h-6 text-stone-300 dark:text-slate-500" />
              </div>
              <p className="font-medium">No transactions yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}