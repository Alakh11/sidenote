import { ArrowRightLeft } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface GroupBalancesProps {
  settlements: { settlements: Settlement[] } | null;
  currentUserName: string;
  onSettle?: (targetName: string, settleAmount: number) => void;
}

export default function GroupBalances({ settlements, currentUserName, onSettle }: GroupBalancesProps) {
  const { currency } = usePreferences();

  if (!settlements || settlements.settlements.length === 0) {
    return (
      <div className="text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center gap-2 mt-4 animate-in fade-in zoom-in-95 duration-300">
        <span className="text-3xl mb-1">🎉</span>
        All settled up! Nobody owes anything.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider uppercase pl-1">
        Current Settlements
      </h3>
      {settlements.settlements.map((s, idx) => {
        const isMeOwe = s.from === currentUserName;
        const isMeOwed = s.to === currentUserName;

        return (
          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#252525] border border-stone-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
            
            <div className="flex items-center gap-3">
              <span className={`font-bold px-3 py-1.5 rounded-xl text-sm border ${isMeOwe ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/30' : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-black/20 dark:text-slate-300 dark:border-white/10'}`}>
                {isMeOwe ? 'You' : s.from}
              </span>
              
              <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                  <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Owes</span>
                  <ArrowRightLeft size={14} />
              </div>
              
              <span className={`font-bold px-3 py-1.5 rounded-xl text-sm border ${isMeOwed ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30' : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-black/20 dark:text-slate-300 dark:border-white/10'}`}>
                {isMeOwed ? 'You' : s.to}
              </span>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="font-extrabold text-slate-800 dark:text-white text-lg tracking-tight">
                {currency}{s.amount.toLocaleString()}
              </div>
              
              {/* Dynamic Settle Button mimicking Google Pay */}
              {isMeOwe && onSettle && (
                <button 
                  onClick={() => onSettle(s.to, s.amount)}
                  className="text-[11px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                >
                  Settle Up
                </button>
              )}
            </div>
            
          </div>
        );
      })}
    </div>
  );
}