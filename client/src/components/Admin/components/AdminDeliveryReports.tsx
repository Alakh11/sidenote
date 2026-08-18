import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Send, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDeliveryReports() {
    const [reports, setReports] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [statusFilter, setStatusFilter] = useState<'failed' | 'all'>('failed');

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/broadcast/reports`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { page, limit, status_filter: statusFilter }
            });
            setReports(res.data);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [page, limit, statusFilter]);

    const handleClearErrors = async () => {
        if (!confirm("Are you sure you want to clear all error logs? This will mark them as 'cleared'.")) return;
        try {
            await axios.post(`${API_URL}/admin/broadcast/reports/clear-errors`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchReports();
        } catch (err) {
            alert("Failed to clear errors");
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || 'unknown';
        if (['delivered', 'read', 'sent'].includes(s)) return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">{s}</span>;
        if (s === 'failed') return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">{s}</span>;
        return <span className="bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">{s}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center"><Send size={20} /></div>
                    <div><p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Outbound</p><h3 className="text-2xl font-black text-stone-800 dark:text-white">{reports?.stats?.total || 0}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                    <div><p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Successfully Sent</p><h3 className="text-2xl font-black text-emerald-600">{reports?.stats?.total_sent || 0}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/30 flex items-center justify-center"><AlertCircle size={20} /></div>
                    <div><p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Failed Deliveries</p><h3 className="text-2xl font-black text-rose-600">{reports?.stats?.total_failed || 0}</h3></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2">
                        Message Logs <span className="bg-stone-200 text-stone-600 dark:bg-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{reports?.total || 0}</span>
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-stone-100 dark:bg-slate-950 p-1 rounded-lg border border-stone-200 dark:border-slate-700">
                            <Filter size={14} className="text-stone-400 ml-1.5 mr-0.5" />
                            <button 
                                onClick={() => { setStatusFilter('failed'); setPage(1); }} 
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'failed' ? 'bg-white dark:bg-slate-800 shadow-sm text-rose-600 dark:text-rose-400' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                                Failures Only
                            </button>
                            <button 
                                onClick={() => { setStatusFilter('all'); setPage(1); }} 
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-stone-500 hover:text-stone-700'}`}
                            >
                                All Outbound
                            </button>
                        </div>

                        <button onClick={fetchReports} className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
                        
                        {statusFilter === 'failed' && (reports?.messages?.length ?? 0) > 0 && (
                            <button onClick={handleClearErrors} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-xs font-bold transition">
                                <Trash2 size={14} /> Clear Log
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Timestamp</th>
                                <th className="p-4 whitespace-nowrap">Target User</th>
                                <th className="p-4">Message Info & Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={3} className="p-8 text-center text-stone-400 font-bold animate-pulse">Loading data...</td></tr>
                            ) : (reports?.messages?.length ?? 0) === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-emerald-500 font-bold">No records found for this filter.</td></tr>
                            ) : (
                                reports?.messages?.map((msg: any) => (
                                    <tr key={msg.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                                        <td className="p-4 text-xs font-mono text-stone-500 whitespace-nowrap">
                                            {new Date(msg.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <p className="font-bold text-sm text-stone-800 dark:text-white">{msg.name || 'Unknown'}</p>
                                            <p className="text-xs text-stone-500 font-mono mt-0.5">{msg.phone_number}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {getStatusBadge(msg.status)}
                                                <span className="text-[10px] font-mono bg-stone-100 dark:bg-slate-800 text-stone-500 px-2 py-0.5 rounded capitalize">{msg.message_type || 'unknown'}</span>
                                            </div>
                                            {(msg.error_code || msg.error_message) && (
                                                <div className="mt-1">
                                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Code: {msg.error_code || 'N/A'}</p>
                                                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-0.5">{msg.error_message}</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-stone-100 dark:border-slate-800 flex justify-between items-center bg-stone-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-sm text-stone-500 font-bold">
                        <select value={limit} onChange={e => {setLimit(Number(e.target.value)); setPage(1);}} className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg p-1 outline-none">
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="hidden sm:inline">per page</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-stone-500 font-bold">Page {reports?.page || 1} of {reports?.total_pages || 1}</span>
                        <div className="flex gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50"><ChevronLeft size={16} className="text-stone-600 dark:text-stone-400"/></button>
                            <button disabled={page >= (reports?.total_pages || 1)} onClick={() => setPage(p => p + 1)} className="p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50"><ChevronRight size={16} className="text-stone-600 dark:text-stone-400"/></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}