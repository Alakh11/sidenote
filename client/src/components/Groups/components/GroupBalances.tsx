import { ArrowRightLeft } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

export default function GroupBalances({ settlements, currentUserName }: any) {
  const { currency } = usePreferences();

  if (!settlements || settlements.settlements.length === 0) {
    return (
      <div className="text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center gap-2 mt-4 animate-in fade-in">
        <span className="text-3xl">🎉</span>
        All settled up! Nobody owes anything.
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 tracking-wider uppercase pl-1">
        Current Settlements
      </h3>
      {settlements.settlements.map((s: any, idx: number) => {
        const isMeOwe = s.from === currentUserName;
        const isMeOwed = s.to === currentUserName;

        return (
          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#252525] border border-stone-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`font-bold px-3 py-1 rounded-lg border ${isMeOwe ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/30' : 'bg-slate-50 text-slate-700 dark:bg-black/20 dark:text-slate-300 dark:border-white/5'}`}>
                {isMeOwe ? 'You' : s.from}
              </span>
              
              <ArrowRightLeft size={14} className="text-slate-400" />
              
              <span className={`font-bold px-3 py-1 rounded-lg border ${isMeOwed ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30' : 'bg-slate-50 text-slate-700 dark:bg-black/20 dark:text-slate-300 dark:border-white/5'}`}>
                {isMeOwed ? 'You' : s.to}
              </span>
            </div>
            <div className="font-bold text-slate-800 dark:text-white text-lg">
              {currency}{s.amount.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}