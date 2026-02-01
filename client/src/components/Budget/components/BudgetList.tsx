import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  budgets: any[];
}

export default function BudgetList({ budgets }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm space-y-8 transition-colors duration-300">
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-700 dark:text-white text-lg">Category Breakdown</h3>
            <span className="text-xs font-bold text-stone-400 dark:text-slate-500 bg-stone-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                {budgets.length} Categories
            </span>
        </div>

        {budgets.length === 0 ? (
            <div className="text-center text-stone-400 dark:text-slate-600 py-10 italic">
                No budgets set. Click the "+" button to start planning.
            </div>
        ) : (
            budgets.map((b: any) => {
                const excess = b.spent - b.budget_limit;
                return (
                <div key={b.category_id} className="group relative">
                    
                    {/* Top Row: Icon | Name | Limit Badge */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl bg-stone-50 dark:bg-slate-800 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm border border-stone-100 dark:border-slate-700">
                                {b.icon}
                            </span>
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                    <p className="font-bold text-stone-800 dark:text-white">{b.name}</p>
                                    <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit">
                                        Limit: ₹{b.budget_limit.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Icon (Right Side) */}
                        {b.is_over ? (
                            <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Over Budget</span>
                                <span className="md:hidden">Over</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">On Track</span>
                                <span className="md:hidden">Good</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-3 w-full bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2 border border-stone-50 dark:border-slate-800">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                b.is_over ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 
                                b.percentage > 85 ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 
                                'bg-gradient-to-r from-emerald-300 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                        ></div>
                    </div>

                    {/* Bottom Row: Spent vs Excess Message */}
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-stone-500 dark:text-slate-400">
                            Spent: <span className="text-stone-900 dark:text-white font-bold">₹{b.spent.toLocaleString()}</span>
                        </span>
                        
                        {b.is_over ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                                Exceeded by ₹{excess.toLocaleString()}!
                            </span>
                        ) : (
                            <span className="text-stone-400 dark:text-slate-500">
                                {Math.round(100 - b.percentage)}% remaining
                            </span>
                        )}
                    </div>
                </div>
            )})
        )}
    </div>
  );
}