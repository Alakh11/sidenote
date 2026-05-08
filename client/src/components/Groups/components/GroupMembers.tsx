import { Shield, User } from 'lucide-react';

export default function GroupMembers({ members, currentUserId }: any) {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-3 animate-in fade-in">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 tracking-wider uppercase pl-1">
        Group Members ({members?.length || 0})
      </h3>
      {members?.map((m: any) => (
        <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#252525] border border-stone-100 dark:border-white/5">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-white flex items-center justify-center font-bold text-sm">
                {getInitials(m.name)}
             </div>
             <div>
                <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {m.name} {m.id === currentUserId && <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-500">You</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
             </div>
          </div>
          {m.role === 'admin' ? (
             <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-500 px-3 py-1 rounded-full">
                <Shield size={12} /> Admin
             </div>
          ) : (
             <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-full">
                <User size={12} /> Member
             </div>
          )}
        </div>
      ))}
    </div>
  );
}