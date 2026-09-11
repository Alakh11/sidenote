import { ArrowRight, CheckCircle2, Bell } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface GroupBalancesProps {
  settlements: { settlements: Settlement[] } | null;
  currentUserName: string;
  onSettle?: (targetName: string, settleAmount: number) => void;
  onRemind?: (targetName: string, amount: number) => void;
}

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

export default function GroupBalances({ settlements, currentUserName, onSettle, onRemind }: GroupBalancesProps) {
  const { currency } = usePreferences();

  if (!settlements || settlements.settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-12 bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mb-1">All Settled Up!</h3>
        <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-500/70">Nobody owes anything in this group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-4 tracking-widest uppercase pl-1">
        Action Required
      </h3>
      
      <div className="flex flex-col gap-3">
        {settlements.settlements.map((s, idx) => {
          const isMeOwe = s.from === currentUserName;
          const isMeOwed = s.to === currentUserName;

          return (
            <div 
              key={idx} 
              className={`p-5 rounded-[1.5rem] border transition-all ${
                isMeOwe 
                  ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20' 
                  : 'bg-white dark:bg-[#1a1a1a] border-stone-100 dark:border-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-[#1a1a1a] flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 z-10">
                      {isMeOwe ? 'You' : getInitials(s.from)}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-white/20 border-2 border-white dark:border-[#1a1a1a] flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white z-0">
                      {isMeOwed ? 'You' : getInitials(s.to)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-800 dark:text-slate-200 leading-tight">
                      <strong className="text-slate-900 dark:text-white">{isMeOwe ? 'You' : s.from}</strong> owes <strong className="text-slate-900 dark:text-white">{isMeOwed ? 'You' : s.to}</strong>
                    </span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                      {isMeOwe ? <><ArrowRight size={10} className="text-rose-500" /> Pay now</> : <><CheckCircle2 size={10} className="text-emerald-500" /> To receive</>}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`font-black text-xl tracking-tight ${isMeOwe ? 'text-rose-600 dark:text-rose-400' : isMeOwed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                    {currency}{s.amount.toLocaleString()}
                  </div>
                  
                  {isMeOwe && onSettle && (
                    <button 
                      onClick={() => onSettle(s.to, s.amount)}
                      className="text-xs font-bold bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
                    >
                      Settle Up
                    </button>
                  )}
                  {isMeOwed && onRemind && (
                    <button 
                      onClick={() => onRemind(s.from, s.amount)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
                    >
                      <Bell size={14} /> Remind
                    </button>
                  )}
                </div>
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}