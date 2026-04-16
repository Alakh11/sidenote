import { useState, useEffect, useCallback } from 'react';
import { Send, Activity, Clock, CalendarDays, BarChart2, Zap } from 'lucide-react';
import axios from 'axios';

export default function AdminEngagementView() {
    const [nudgeLogs, setNudgeLogs] = useState<any[]>([]);
    const [activityStats, setActivityStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    
    const API_URL = "https://api.sidenote.in";

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [logsRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/engagement/logs?limit=100`, config),
                axios.get(`${API_URL}/admin/engagement/activity`, config)
            ]);
            setNudgeLogs(logsRes.data);
            setActivityStats(statsRes.data);
        } catch (error) {
            console.error("Failed to fetch engagement data", error);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTriggerNudges = async () => {
        if (!confirm("Run the automated nudge engine now? This will evaluate all users and fire templates according to the inactivity rules.")) return;
        
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/trigger-nudges`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setTimeout(() => {
                fetchData();
                setIsTriggering(false);
                alert(res.data.message);
            }, 2000);
            
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to trigger nudges.");
            setIsTriggering(false);
        }
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return 'Never';
        const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        return new Date(utcString).toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
        });
    };

    if (loading) return <div className="text-center p-10 text-stone-500 font-bold animate-pulse">Loading engagement data...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Section 1: Automated Nudge Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Send size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg text-stone-800 dark:text-white">Automated Nudge History</h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Recent templates fired by the system rules.</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleTriggerNudges}
                        disabled={isTriggering}
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isTriggering ? (
                            <span className="animate-pulse">Running Engine...</span>
                        ) : (
                            <><Zap size={16} /> Run Engine Now</>
                        )}
                    </button>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Time Sent</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Template Name</th>
                                <th className="p-4">Trigger Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
                            {nudgeLogs.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-stone-400 italic">No automated messages sent yet.</td></tr>
                            ) : nudgeLogs.map((log) => (
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
                </div>
            </div>

            {/* Section 2: User Activity Leaderboard */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Activity size={20} /></div>
                    <div>
                        <h3 className="font-bold text-lg text-stone-800 dark:text-white">User Activity & Retention</h3>
                        <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Overview of logging habits based on transaction dates.</p>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4 text-center"><div className="flex items-center justify-center gap-1"><BarChart2 size={14}/> Total Logs</div></th>
                                <th className="p-4 text-center"><div className="flex items-center justify-center gap-1"><CalendarDays size={14}/> Active Days</div></th>
                                <th className="p-4 text-center"><div className="flex items-center justify-center gap-1"><Clock size={14}/> Account Age</div></th>
                                <th className="p-4">Last Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
                            {activityStats.map((stat) => (
                                <tr key={stat.user_id} className="hover:bg-stone-50 dark:hover:bg-slate-800/30">
                                    <td className="p-4">
                                        <p className="font-bold text-stone-800 dark:text-white">{stat.name}</p>
                                        <p className="text-xs text-stone-400">{stat.mobile}</p>
                                    </td>
                                    <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">{stat.total_transactions}</td>
                                    <td className="p-4 text-center font-bold text-stone-700 dark:text-slate-300">{stat.active_days} days</td>
                                    <td className="p-4 text-center font-medium text-stone-500 dark:text-slate-400">{stat.days_since_joining} days</td>
                                    <td className="p-4 font-medium text-stone-500 dark:text-slate-400">{formatTime(stat.last_active_date)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}