import { Send, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';

export default function AutomatedNudgeHistory({ logs, loading, page, total, limit, sortBy, sortOrder, onSort, onPageChange }: any) {
    const formatTime = (dateString: string) => {
        if (!dateString) return 'Never';
        const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        return new Date(utcString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderSortIcon = (field: string) => {
        if (sortBy !== field) return <ArrowUp size={14} className="opacity-20 inline-block ml-1" />;
        return sortOrder === 'ASC' 
            ? <ArrowUp size={14} className="text-emerald-500 inline-block ml-1" />
            : <ArrowDown size={14} className="text-emerald-500 inline-block ml-1" />;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Send size={20} /></div>
                <div>
                    <h3 className="font-bold text-lg text-stone-800 dark:text-white">Automated Nudge History</h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Recent templates fired by the system rules.</p>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                {loading ? (
                    <div className="p-10 text-center text-stone-400 font-bold animate-pulse">Loading logs...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => onSort('sent_at')}>
                                    Time Sent {renderSortIcon('sent_at')}
                                </th>
                                <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => onSort('user_name')}>
                                    User {renderSortIcon('user_name')}
                                </th>
                                <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => onSort('template_name')}>
                                    Template Name {renderSortIcon('template_name')}
                                </th>
                                <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => onSort('trigger_reason')}>
                                    Trigger Reason {renderSortIcon('trigger_reason')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
                            {logs.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-stone-400 italic">No automated messages sent yet.</td></tr>
                            ) : logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/30">
                                    <td className="p-4 font-medium text-stone-600 dark:text-slate-300">{formatTime(log.sent_at)}</td>
                                    <td className="p-4">
                                        <p className="font-bold text-stone-800 dark:text-white">{log.user_name}</p>
                                        <p className="text-xs text-stone-400">{log.mobile}</p>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded inline-block mt-3">{log.template_name}</td>
                                    <td className="p-4 text-stone-500 dark:text-slate-400 capitalize">{log.trigger_reason?.replace(/_/g, ' ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="p-4 border-t border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/30 flex justify-between items-center text-sm">
                <span className="text-stone-500 dark:text-slate-400 font-medium">
                    Showing {total === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronLeft size={18}/></button>
                    <button onClick={() => onPageChange(page + 1)} disabled={page * limit >= total} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronRight size={18}/></button>
                </div>
            </div>
        </div>
    );
}