import { Wallet, TrendingUp, IndianRupee } from 'lucide-react';

interface Props {
  budgets: any[];
}

export default function BudgetOverview({ budgets }: Props) {
  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.budget_limit) || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Total Budget Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm transition-colors duration-300">
         <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Wallet className="w-6 h-6" />
            </div>
            <span className="text-stone-500 dark:text-slate-400 font-bold text-sm uppercase">Total Budget</span>
         </div>
         <p className="text-2xl font-black text-stone-800 dark:text-white">₹{totalBudget.toLocaleString()}</p>
      </div>

      {/* Total Spent Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm transition-colors duration-300">
         <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
                <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-stone-500 dark:text-slate-400 font-bold text-sm uppercase">Spent so far</span>
         </div>
         <p className="text-2xl font-black text-stone-800 dark:text-white">₹{totalSpent.toLocaleString()}</p>
      </div>

      {/* Remaining Card (Dynamic Colors) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm transition-colors duration-300">
         <div className="flex items-center gap-4 mb-2">
            <div className={`p-3 rounded-xl ${
                totalRemaining < 0 
                ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }`}>
                <IndianRupee className="w-6 h-6" />
            </div>
            <span className="text-stone-500 dark:text-slate-400 font-bold text-sm uppercase">Remaining</span>
         </div>
         <p className={`text-2xl font-black ${
             totalRemaining < 0 
             ? 'text-rose-600 dark:text-rose-400' 
             : 'text-emerald-600 dark:text-emerald-400'
         }`}>
             {totalRemaining < 0 ? '-' : ''}₹{Math.abs(totalRemaining).toLocaleString()}
         </p>
      </div>
    </div>
  );
}