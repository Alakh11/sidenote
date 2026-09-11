import { Users, Home, Scissors, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

interface GroupHeaderProps {
  group: { name: string; type: string; max_members: number };
  settlements: { settlements: any[]; total_spend: number } | null;
  totalSpend: number;
  members: { id: number; name: string; email: string }[];
  currentUserId: number;
}

export default function GroupHeader({ group, settlements, totalSpend, members, currentUserId }: GroupHeaderProps) {
  const { currency } = usePreferences();
  const isSplit = group.type === 'split';

  let userBalance = 0;
  if (isSplit && settlements?.settlements) {
    settlements.settlements.forEach((s: any) => {
      if (s.from_id === currentUserId) userBalance -= s.amount;
      if (s.to_id === currentUserId) userBalance += s.amount;
    });
  }

  const getGroupIcon = () => {
    if (group.type === 'family') return <Home className="w-5 h-5" />;
    if (group.type === 'split') return <Scissors className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  return (
    <div className="bg-slate-900 dark:bg-black rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden mb-6 animate-in fade-in duration-500">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
              {getGroupIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-none">{group.name}</h2>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">{group.type} Group</p>
            </div>
          </div>

          {members && members.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((m, i) => (
                  <div 
                    key={m.id} 
                    className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                    style={{ zIndex: 10 - i }}
                    title={m.name}
                  >
                    {m.name.substring(0, 2).toUpperCase()}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400 z-0">
                    +{members.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400 ml-3 font-medium">{members.length} members</span>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md min-w-[150px]">
          {!isSplit ? (
            <>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Total Spent</div>
              <div className="text-2xl font-black text-white tracking-tight">{currency}{(totalSpend || 0).toLocaleString()}</div>
            </>
          ) : (
            <>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                {userBalance < -0.01 ? <><ArrowUpRight size={12} className="text-rose-400"/> You Owe</> : 
                 userBalance > 0.01 ? <><ArrowDownRight size={12} className="text-emerald-400"/> You're Owed</> : 
                 <><CheckCircle2 size={12} className="text-slate-400"/> Settled Up</>}
              </div>
              <div className={`text-2xl font-black tracking-tight ${
                userBalance < -0.01 ? 'text-rose-400' : 
                userBalance > 0.01 ? 'text-emerald-400' : 'text-white'
              }`}>
                {currency}{Math.abs(userBalance || 0).toLocaleString()}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}