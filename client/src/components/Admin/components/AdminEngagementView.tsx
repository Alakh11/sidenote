import { useState, useEffect, useCallback } from 'react';
import { Send, Activity, Clock, CalendarDays, BarChart2, Zap, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function AdminEngagementView() {
    const [nudgeLogs, setNudgeLogs] = useState<any[]>([]);
    const [activityStats, setActivityStats] = useState<any[]>([]);
    const [loadingNudges, setLoadingNudges] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    
    const [nudgePage, setNudgePage] = useState(1);
    const [nudgeTotal, setNudgeTotal] = useState(0);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotal, setActivityTotal] = useState(0);
    const LIMIT = 10;

    const API_URL = "https://api.sidenote.in";

    const fetchNudges = useCallback(async () => {
        setLoadingNudges(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/logs?page=${nudgePage}&limit=${LIMIT}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNudgeLogs(res.data.data);
            setNudgeTotal(res.data.total);
        } catch (error) {
            console.error("Failed to fetch nudge logs", error);
        } finally {
            setLoadingNudges(false);
        }
    }, [nudgePage, API_URL]);

    const fetchActivity = useCallback(async () => {
        setLoadingActivity(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/activity?page=${activityPage}&limit=${LIMIT}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivityStats(res.data.data);
            setActivityTotal(res.data.total);
        } catch (error) {
            console.error("Failed to fetch activity stats", error);
        } finally {
            setLoadingActivity(false);
        }
    }, [activityPage, API_URL]);

    useEffect(() => { fetchNudges(); }, [fetchNudges]);
    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    const handleTriggerNudges = async () => {
        if (!confirm("Run the automated nudge engine now? This will evaluate all users and fire templates according to the inactivity rules.")) return;
        
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/trigger-nudges`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setTimeout(() => {
                setNudgePage(1);
                fetchNudges();
                setIsTriggering(false);
                alert(res.data.message);
            }, 2500);
            
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to trigger nudges.");
            setIsTriggering(false);
        }
    };

    const handleFlushAndTrigger = async () => {
        if (!confirm("SUPERADMIN ACTION: Are you sure you want to delete all previous automated message logs and run the engine fresh? This cannot be undone.")) return;
        
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/flush-and-trigger`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setTimeout(() => {
                setNudgePage(1);
                fetchNudges();
                setIsTriggering(false);
                alert(res.data.message);
            }, 2500);
            
        } catch (error: any) {
            alert(error.response?.data?.detail || "Action denied. Only Superadmins can flush logs.");
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Section 1: Automated Nudge Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Send size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg text-stone-800 dark:text-white">Automated Nudge History</h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Recent templates fired by the system rules.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleFlushAndTrigger}
                            disabled={isTriggering}
                            className="px-4 py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <AlertTriangle size={16} /> Flush & Run Engine
                        </button>
                        <button 
                            onClick={handleTriggerNudges}
                            disabled={isTriggering}
                            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isTriggering ? <span className="animate-pulse">Running Engine...</span> : <><Zap size={16} /> Run Engine Now</>}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loadingNudges ? (
                        <div className="p-10 text-center text-stone-400 font-bold animate-pulse">Loading logs...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
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
                    )}
                </div>
                
                {/* Pagination Footer */}
                <div className="p-4 border-t border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/30 flex justify-between items-center text-sm">
                    <span className="text-stone-500 dark:text-slate-400 font-medium">
                        Showing {nudgeTotal === 0 ? 0 : ((nudgePage - 1) * LIMIT) + 1} to {Math.min(nudgePage * LIMIT, nudgeTotal)} of {nudgeTotal}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setNudgePage(p => p - 1)} disabled={nudgePage === 1} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronLeft size={18}/></button>
                        <button onClick={() => setNudgePage(p => p + 1)} disabled={nudgePage * LIMIT >= nudgeTotal} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {/* Section 2: User Activity Leaderboard */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Activity size={20} /></div>
                    <div>
                        <h3 className="font-bold text-lg text-stone-800 dark:text-white">User Activity & Retention</h3>
                        <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Overview of logging habits based on transaction dates.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto min-h-[300px]">
                    {loadingActivity ? (
                        <div className="p-10 text-center text-stone-400 font-bold animate-pulse">Loading activity...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
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
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/30 flex justify-between items-center text-sm">
                    <span className="text-stone-500 dark:text-slate-400 font-medium">
                        Showing {activityTotal === 0 ? 0 : ((activityPage - 1) * LIMIT) + 1} to {Math.min(activityPage * LIMIT, activityTotal)} of {activityTotal}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setActivityPage(p => p - 1)} disabled={activityPage === 1} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronLeft size={18}/></button>
                        <button onClick={() => setActivityPage(p => p + 1)} disabled={activityPage * LIMIT >= activityTotal} className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

        </div>
    );
}