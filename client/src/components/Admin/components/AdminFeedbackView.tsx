import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bug, Star, MessageSquare, Trash2, CheckCircle2, Send, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

export default function AdminFeedbackView() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/feedback`, { 
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { page, limit, search: debouncedSearch, start_date: startDate, end_date: endDate }
            });
            setTickets(res.data.data);
            setTotalPages(res.data.total_pages);
        } catch (error) { console.error("Failed to load feedback"); } finally { setLoading(false); }
    };

    useEffect(() => { fetchFeedback(); }, [page, limit, debouncedSearch, startDate, endDate]);

    const submitReply = async (ticketId: number) => {
        if (!replyText.trim()) return alert("Reply cannot be empty.");
        try {
            await axios.post(`${API_URL}/admin/feedback/${ticketId}/reply`, { reply: replyText }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setReplyingTo(null);
            setReplyText('');
            fetchFeedback();
        } catch (err) { alert("Failed to send reply."); }
    };

    const deleteTicket = async (ticketId: number) => {
        if (!confirm("Delete this ticket permanently?")) return;
        try {
            await axios.delete(`${API_URL}/admin/feedback/${ticketId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchFeedback();
        } catch (err) { alert("Failed to delete ticket."); }
    };

    const getBadgeStyle = (type: string) => {
        if (type === 'issue') return "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400";
        if (type === 'review') return "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
        return "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Filter Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input placeholder="Search tickets..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 text-sm w-full md:w-auto">
                    <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 dark:text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span className="text-stone-400 font-bold">to</span>
                    <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 dark:text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    {(search || startDate || endDate) && <button onClick={() => {setSearch(''); setStartDate(''); setEndDate('');}} className="text-rose-500 hover:underline text-xs font-bold px-2">Clear</button>}
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-stone-500 animate-pulse">Loading tickets...</div>
            ) : tickets.length === 0 ? (
                <div className="p-10 text-center text-stone-500">No tickets found matching filters.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tickets.map((t: any) => (
                        <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center font-bold text-stone-500 overflow-hidden">
                                        {t.profile_pic && t.profile_pic.startsWith('http') ? <img src={t.profile_pic} className="w-full h-full object-cover" /> : (t.user_name ? t.user_name.charAt(0) : '?')}
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-800 dark:text-white text-sm">{t.user_name || "Unknown User"}</p>
                                        <p className="text-xs text-stone-500 dark:text-slate-400">{t.user_email || `User ID: ${t.user_id}`}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${getBadgeStyle(t.type)}`}>
                                            {t.type === 'issue' ? <Bug size={14}/> : t.type === 'review' ? <Star size={14}/> : <MessageSquare size={14}/>} {t.type}
                                        </span>
                                        <button onClick={() => deleteTicket(t.id)} className="p-1 text-stone-400 hover:text-rose-500 rounded-md transition-colors" title="Delete Ticket"><Trash2 size={16} /></button>
                                    </div>
                                    {t.status === 'resolved' && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase"><CheckCircle2 size={10} className="inline mr-1"/>Resolved</span>}
                                </div>
                            </div>

                            <h4 className="font-bold text-stone-800 dark:text-white mb-2">{t.subject}</h4>
                            {t.type === 'review' && t.rating > 0 && (
                                <div className="flex gap-1 mb-3">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className={s <= t.rating ? "fill-amber-400 text-amber-400" : "text-stone-300 dark:text-slate-700"} />)}</div>
                            )}
                            <div className="p-3 bg-stone-50 dark:bg-slate-950/50 rounded-xl text-sm text-stone-600 dark:text-slate-300 whitespace-pre-wrap mb-4">
                                {t.message}
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-stone-100 dark:border-slate-800">
                                {/* Display existing replies thread */}
                                {t.admin_reply && (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 mb-4">
                                        <p className="text-sm text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap font-medium leading-relaxed">{t.admin_reply}</p>
                                    </div>
                                )}
                                
                                {/* Always allow appending another reply */}
                                {replyingTo === t.id ? (
                                    <div className="space-y-2">
                                        <textarea autoFocus className="w-full p-3 text-sm bg-stone-50 dark:bg-slate-950 rounded-xl border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none" rows={3} placeholder="Add a reply to this thread..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                                        <div className="flex gap-2">
                                            <button onClick={() => setReplyingTo(null)} className="flex-1 py-2 bg-stone-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-stone-600 dark:text-slate-300">Cancel</button>
                                            <button onClick={() => submitReply(t.id)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2"><Send size={14}/> Send Reply</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setReplyingTo(t.id)} className="w-full py-2.5 border-2 border-dashed border-stone-200 dark:border-slate-700 text-stone-500 hover:border-indigo-500 hover:text-indigo-600 rounded-xl font-bold text-sm transition-colors">
                                        {t.admin_reply ? "Add Another Reply" : "Write a Reply"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border border-stone-100 dark:border-slate-800 rounded-[2rem] flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-stone-500 font-bold">
                    <select value={limit} onChange={e => {setLimit(Number(e.target.value)); setPage(1);}} className="bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-lg p-1 outline-none">
                        <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                    </select>
                    <span>per page</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500 font-bold">Page {page} of {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-stone-100 transition"><ChevronLeft size={16} className="text-stone-600"/></button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-stone-100 transition"><ChevronRight size={16} className="text-stone-600"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
}