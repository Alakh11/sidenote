import { Divide, Percent, UserMinus, ArrowUpRight, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

// Helper to group transactions by date
const groupTransactionsByDate = (transactions: any[]) => {
  if (!transactions) return {};
  const groups: { [key: string]: any[] } = {};
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = new Date(today - 86400000).getTime();

  transactions.forEach((tx) => {
    // Note: ensure your backend returns 'date' or map it if it returns 'logged_at'
    const txDate = new Date(tx.date).setHours(0, 0, 0, 0);
    let label = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (txDate === today) label = 'TODAY';
    else if (txDate === yesterday) label = 'YESTERDAY';

    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return groups;
};

// Helper to get initials safely
const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

export default function GroupFeed({ 
  transactions, 
  group, 
  currentUserId, 
  page, 
  setPage, 
  hasMore, 
  onLogTransaction,
  onDeleteTransaction // Make sure to pass this prop from GroupDashboard!
}: any) {
  const { currency } = usePreferences();
  const groupedTxns = groupTransactionsByDate(transactions || []);
  const isSplit = group?.type === 'split';

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center flex flex-col items-center justify-center mt-12 animate-in fade-in">
        <div className="text-slate-400 dark:text-slate-500 mb-4">No transactions logged yet.</div>
        <button 
          onClick={onLogTransaction}
          className="px-6 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-800/30 font-bold text-sm transition-colors"
        >
          + Log your first transaction
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {Object.entries(groupedTxns).map(([dateLabel, txns]) => (
        <div key={dateLabel}>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 tracking-wider uppercase pl-1">
            {dateLabel}
          </h3>
          <div className="space-y-3">
            {(txns as any[]).map((t) => (
              <div key={t.id} className="group bg-white dark:bg-[#252525] rounded-2xl p-4 border border-stone-100 dark:border-white/5 shadow-sm hover:border-blue-100 dark:hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-slate-100 dark:text-slate-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {getInitials(t.paid_by)}
                    </div>
                    <div>
                      <div className="text-sm text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-slate-900 dark:text-white">{t.paid_by}</span> {isSplit ? 'split' : 'logged'}
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {t.description.split(' ')[0]} {/* Simple category badge extraction */}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                        {isSplit ? `split ${t.amount} ${t.description}` : `group ${t.amount} ${t.description}`}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="font-bold text-slate-900 dark:text-white text-lg">
                      {currency}{t.amount.toLocaleString()}
                    </div>
                    
                    {/* Delete Button - Only visible if the current user logged it */}
                    {t.paid_by_user_id === currentUserId && onDeleteTransaction && (
                      <button 
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Pay Style Split Badges (Only shown in Split Groups) */}
                {isSplit && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-white/5">
                    {t.split_type === 'percentage' ? (
                       <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                          <Percent size={12} /> Custom %
                       </div>
                    ) : t.split_type === 'subset' ? (
                       <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                          <UserMinus size={12} /> Excluded self
                       </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                        <Divide size={12} /> Equal · {group.max_members} members
                      </div>
                    )}
                    
                    {/* Simulated debt logic based on current user */}
                    {t.paid_by_user_id !== currentUserId && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-900/10 dark:border-rose-900/30 px-3 py-1 rounded-full">
                        You owe {currency}{Math.round(t.amount / group.max_members).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pagination Controls */}
      {transactions?.length > 0 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-100 dark:border-white/5">
          <button 
            disabled={page === 1} 
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-slate-500 font-medium">Page {page}</span>
          <button 
            disabled={!hasMore} 
            onClick={() => setPage((p: number) => p + 1)}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Floating Log Action Button */}
      <button 
        onClick={onLogTransaction}
        className="w-full mt-4 py-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center gap-2 transition-colors font-bold text-sm"
      >
         + Log a transaction <ArrowUpRight size={16} />
      </button>
    </div>
  );
}