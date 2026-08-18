import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, Send } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDeliveryReports() {
    const [reports, setReports] = useState<{ stats: any, failures: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/broadcast/reports`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setReports(res.data);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    const handleClearErrors = async () => {
        if (!confirm("Are you sure you want to clear all error logs?")) return;
        try {
            await axios.post(`${API_URL}/admin/broadcast/reports/clear-errors`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchReports();
        } catch (err) {
            alert("Failed to clear errors");
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-stone-500 font-bold">Loading Reports...</div>;

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

            {/* Error Log Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex justify-between items-center bg-stone-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2">
                        Delivery Failures <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full">{reports?.failures?.length ?? 0}</span>
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchReports} className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition"><RefreshCw size={18} /></button>
                        {(reports?.failures?.length ?? 0) > 0 && (
                            <button onClick={handleClearErrors} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-xs font-bold transition">
                                <Trash2 size={14} /> Clear Log
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Timestamp</th>
                                <th className="p-4 whitespace-nowrap">Target User</th>
                                <th className="p-4">Error Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                            {(reports?.failures?.length ?? 0) === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-emerald-500 font-bold">No recent delivery failures!</td></tr>
                            ) : (
                                reports?.failures?.map((fail: any) => (
                                    <tr key={fail.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                                        <td className="p-4 text-xs font-mono text-stone-500">
                                            {new Date(fail.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-sm text-stone-800 dark:text-white">{fail.name || 'Unknown'}</p>
                                            <p className="text-xs text-stone-500 font-mono">{fail.phone_number}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Code: {fail.error_code}</p>
                                            <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">{fail.error_message}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}