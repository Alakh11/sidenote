import { Users, Home, Scissors } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

export default function GroupHeader({ group, settlements, totalSpend, members, currentUserName }: any) {
  const { currency } = usePreferences();
  const isSplit = group.type === 'split';

  let userBalance = 0;
  if (isSplit && settlements?.settlements) {
    settlements.settlements.forEach((s: any) => {
      if (s.from === currentUserName) userBalance -= s.amount;
      if (s.to === currentUserName) userBalance += s.amount;
    });
  }

  const getGroupIcon = () => {
    if (group.type === 'family') return <Home className="w-6 h-6 text-emerald-600" />;
    if (group.type === 'split') return <Scissors className="w-6 h-6 text-rose-500" />;
    return <Users className="w-6 h-6 text-blue-500" />;
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] flex items-center justify-center border-2 border-stone-100 dark:border-white/10 shrink-0">
          {getGroupIcon()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{group.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {members ? members.length : group.max_members} members · {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="text-right">
        {!isSplit ? (
          <>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Total spent</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{currency}{(totalSpend || 0).toLocaleString()}</div>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
              {userBalance < -0.01 ? 'You owe' : userBalance > 0.01 ? 'You are owed' : 'Settled up'}
            </div>
            <div className={`text-xl font-bold ${userBalance < -0.01 ? 'text-rose-500' : userBalance > 0.01 ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
              {currency}{Math.abs(userBalance || 0).toLocaleString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}