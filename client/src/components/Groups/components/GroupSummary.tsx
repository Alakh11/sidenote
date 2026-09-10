import { usePreferences } from '../../../context/PreferencesContext';
import { PieChart } from 'lucide-react';

export interface SummaryTransaction {
  amount: number | string;
  description: string;
  category?: string; 
  category_icon?: string;
}

interface GroupSummaryProps {
  transactions: SummaryTransaction[] | null | undefined;
}

export default function GroupSummary({ transactions }: GroupSummaryProps) {
  const { currency } = usePreferences();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-12 bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] border border-stone-100 dark:border-white/5 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-white dark:bg-black/20 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-1">No Data Yet</h3>
        <p className="text-sm font-medium text-slate-500">Log some transactions to see your spending breakdown.</p>
      </div>
    );
  }

  let totalSpend = 0;
  const categories: Record<string, { amount: number, icon: string }> = {};
  
  transactions.forEach((t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
    const catName = t.category || 'Misc Expenses';
    const catIcon = t.category_icon || '🧾'; 
    
    if (!categories[catName]) {
        categories[catName] = { amount: 0, icon: catIcon };
    }
    
    categories[catName].amount += amount;
    totalSpend += amount;
  });

  const sortedCategories = Object.entries(categories).sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-4 tracking-widest uppercase pl-1">
        This month by category
      </h3>
      
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] border border-stone-100 dark:border-white/5 p-2 shadow-sm">
        {sortedCategories.map(([cat, data], index) => {
          const percentage = totalSpend > 0 ? (data.amount / totalSpend) * 100 : 0;
          
          return (
            <div 
              key={cat} 
              className={`relative overflow-hidden p-4 ${index !== sortedCategories.length - 1 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-blue-50 dark:bg-blue-900/10 z-0 transition-all duration-1000 ease-out rounded-r-xl"
                style={{ width: `${percentage}%` }}
              ></div>

              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xl drop-shadow-sm bg-white dark:bg-black/20 w-8 h-8 rounded-full flex items-center justify-center">
                    {data.icon}
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white leading-tight">{cat}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="font-black text-slate-800 dark:text-white tracking-tight">
                  {currency}{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}