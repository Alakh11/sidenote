import { Divide, Percent, ArrowUpRight, ChevronLeft, ChevronRight, Trash2, ReceiptText, Edit2 } from 'lucide-react';
import { usePreferences } from '../../../context/PreferencesContext';

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  paid_by: string;
  paid_by_user_id: number;
  split_type: string;
  split_details?: any;
  payment_mode?: string;
  category_id?: number;
  category?: string;
  category_icon?: string;
}

interface GroupFeedProps {
  transactions: Transaction[];
  group: { type: string } | null;
  currentUserId: number;
  page: number;
  setPage: (val: number | ((prev: number) => number)) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  hasMore: boolean;
  onLogTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction?: (txId: number) => void;
  actualMemberCount: number;
}

const groupTransactionsByDate = (transactions: Transaction[]) => {
  if (!transactions) return {};
  const groups: Record<string, Transaction[]> = {};
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = new Date(today - 86400000).getTime();

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date).setHours(0, 0, 0, 0);
    let label = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (txDate === today) label = 'TODAY';
    else if (txDate === yesterday) label = 'YESTERDAY';

    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return groups;
};

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

export default function GroupFeed({ 
  transactions, 
  group, 
  currentUserId, 
  page, 
  setPage,
  limit,
  onLimitChange,
  hasMore, 
  onLogTransaction,
   onEditTransaction,
  onDeleteTransaction,
  actualMemberCount
}: GroupFeedProps) {
  const { currency } = usePreferences();
  const groupedTxns = groupTransactionsByDate(transactions || []);
  const isSplit = group?.type === 'split';

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
          <ReceiptText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-1">No expenses yet</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">Be the first to log a transaction!</p>
        <button 
          onClick={onLogTransaction}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm transition-all shadow-md active:scale-95"
        >
          + Log your first transaction
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {Object.entries(groupedTxns).map(([dateLabel, txns]) => (
        <div key={dateLabel}>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 tracking-widest uppercase sticky top-0 bg-slate-50/90 dark:bg-[#121212]/90 backdrop-blur-md py-2 z-10">{dateLabel}</h3>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] border border-stone-100 dark:border-white/5 shadow-sm overflow-hidden">
            {txns.map((t, index) => (
              <div key={t.id} className={`group relative p-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${index !== txns.length - 1 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}>
                <div className="flex justify-between items-start">
                  
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200 dark:border-white/5">
                      {getInitials(t.paid_by)}
                    </div>
                    <div>
                      <div className="text-sm text-slate-800 dark:text-slate-200 leading-tight">
                        <span className="font-bold text-slate-900 dark:text-white">{t.paid_by === "You" || t.paid_by_user_id === currentUserId ? "You" : t.paid_by}</span> {isSplit ? 'split' : 'logged'}
                      </div>
                      <div className="text-base font-medium text-slate-900 dark:text-white mt-0.5 capitalize tracking-tight">
                        {t.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {t.category && (
                           <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[9px] font-bold text-slate-500 dark:text-slate-400 capitalize tracking-wider flex items-center gap-1">
                             {t.category_icon} {t.category}
                           </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 relative">
                    <div className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
                      {currency}{t.amount.toLocaleString()}
                    </div>
                    
                    {t.paid_by_user_id === currentUserId && (
                      <div className="absolute -top-1 -right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all">
                        <button 
                          onClick={() => onEditTransaction(t)}
                          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                          title="Edit Transaction"
                        >
                          <Edit2 size={16} />
                        </button>
                        {onDeleteTransaction && (
                          <button 
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isSplit && (
                  <div className="flex flex-wrap gap-2 mt-3 ml-16">
                    {t.split_type === 'percentage' ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          <Percent size={10} /> Percentage
                      </div>
                    ) : t.split_type === 'exact' ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          Exact
                      </div>
                    ) : t.split_type === 'ratio' ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          Ratio
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        <Divide size={10} /> Equal · {actualMemberCount}
                      </div>
                    )}
                    
                    {t.paid_by_user_id !== currentUserId && t.split_type === 'equal' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-900/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        You owe {currency}{Math.round(t.amount / (actualMemberCount || 1)).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {transactions?.length > 0 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-100 dark:border-white/5">
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage((p: number) => Math.max(1, p - 1))}
              className="p-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              disabled={!hasMore} 
              onClick={() => setPage((p: number) => p + 1)}
              className="p-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {page}</span>
             <div className="flex items-center gap-2 text-xs text-slate-500 font-bold border-l border-stone-200 dark:border-slate-700 pl-3">
                <select 
                  value={limit} 
                  onChange={(e) => onLimitChange(Number(e.target.value))} 
                  className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-slate-700 rounded-lg p-1 outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span className="hidden sm:inline">per page</span>
             </div>
          </div>

        </div>
      )}

      <button 
        onClick={onLogTransaction}
        className="fixed bottom-24 right-6 sm:static sm:w-full sm:mt-6 py-4 px-6 rounded-full sm:rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-xl sm:shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 z-40 group"
      >
         <span className="hidden sm:inline font-bold">Log a transaction</span> 
         <ArrowUpRight size={20} className="sm:hidden group-hover:scale-110 transition-transform" />
         <ArrowUpRight size={18} className="hidden sm:block" />
      </button>
    </div>
  );
}