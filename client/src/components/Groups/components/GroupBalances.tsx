import { CheckCircle2, Bell } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';
import type { GroupBalances as Balances, MemberBalance } from '../groupLedger';

interface GroupBalancesProps {
  balances: Balances | null | undefined;
  onSettle?: (b: MemberBalance) => void;
  onReceived?: (b: MemberBalance) => void;
  onRemind?: (targetId: number, targetName: string, amount: number) => void;
}

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

/** Your balance with each member, pair by pair (the way Google Pay splits work) */
export default function GroupBalances({ balances, onSettle, onReceived, onRemind }: GroupBalancesProps) {
  const { currency } = usePreferences();
  const open = (balances?.members ?? []).filter((b) => Math.abs(b.net) >= 0.01);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
          <div className="text-[10px] font-bold tracking-widest text-rose-600 dark:text-rose-400">YOU OWE</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{currency}{(balances?.you_owe ?? 0).toLocaleString()}</div>
        </div>
        <div className="rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
          <div className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400">YOU'RE OWED</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{currency}{(balances?.you_are_owed ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {open.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-6 bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mb-1">All Settled Up!</h3>
          <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-500/70">You and everyone here are even.</p>
        </div>
      ) : (
        <>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase pl-1">With each person</h3>
          <div className="flex flex-col gap-3">
            {open.map((b) => {
              const iOwe = b.net < 0;
              const amount = Math.abs(b.net);
              return (
                <div key={b.user_id} className={`p-5 rounded-[1.5rem] border ${iOwe ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20' : 'bg-white dark:bg-[#1a1a1a] border-stone-100 dark:border-white/5'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">{getInitials(b.name)}</div>
                      <div className="min-w-0">
                        <div className="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {iOwe ? <>You owe <strong className="text-slate-900 dark:text-white">{b.name}</strong></> : <><strong className="text-slate-900 dark:text-white">{b.name}</strong> owes you</>}
                        </div>
                        <div className={`font-black text-xl ${iOwe ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{currency}{amount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {iOwe && onSettle && (
                        <button onClick={() => onSettle(b)} className="text-xs font-bold bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 px-4 py-2 rounded-xl transition-all active:scale-95">Settle up</button>
                      )}
                      {!iOwe && onRemind && (
                        <button onClick={() => onRemind(b.user_id, b.name, amount)} className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded-xl transition-all active:scale-95"><Bell size={14} /> Remind</button>
                      )}
                      {!iOwe && onReceived && (
                        <button onClick={() => onReceived(b)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Mark received</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
