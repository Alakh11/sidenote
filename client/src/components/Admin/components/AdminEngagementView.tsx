import { useState, useEffect, useCallback } from 'react';
import { Send, Activity, Clock, CalendarDays, BarChart2, Zap, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Play, Pause, Server, Power, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function AdminEngagementView() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const LIMIT = 10;
    const API_URL = "https://api.sidenote.in";

    // --- Master Cron State ---
    const [cronStatus, setCronStatus] = useState<'running' | 'paused' | 'offline'>('offline');
    const [togglingCron, setTogglingCron] = useState(false);

    // --- Rule Engine State ---
    const [rules, setRules] = useState<any[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);

    // --- Nudge Table State ---
    const [nudgeLogs, setNudgeLogs] = useState<any[]>([]);
    const [loadingNudges, setLoadingNudges] = useState(true);
    const [nudgePage, setNudgePage] = useState(1);
    const [nudgeTotal, setNudgeTotal] = useState(0);
    const [nudgeSortBy, setNudgeSortBy] = useState('sent_at');
    const [nudgeSortOrder, setNudgeSortOrder] = useState('DESC');

    // --- Activity Table State ---
    const [activityStats, setActivityStats] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotal, setActivityTotal] = useState(0);
    const [activitySortBy, setActivitySortBy] = useState('last_active_date');
    const [activitySortOrder, setActivitySortOrder] = useState('DESC');

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user_data');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj.role === 'superadmin') setIsSuperAdmin(true);
            }
        } catch (e) {
            console.error("Failed to parse user role");
        }
    }, []);

    // --- API Fetchers ---
    const fetchCronStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/cron-status`, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus(res.data.status);
        } catch (error) { console.error("Cron status error", error); }
    }, []);

    const fetchRules = useCallback(async () => {
        setLoadingRules(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/rules`, { headers: { Authorization: `Bearer ${token}` } });
            setRules(res.data);
        } catch (error) { console.error("Rules fetch error", error); }
        finally { setLoadingRules(false); }
    }, []);

    const fetchNudges = useCallback(async () => {
        setLoadingNudges(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/logs?page=${nudgePage}&limit=${LIMIT}&sort_by=${nudgeSortBy}&sort_order=${nudgeSortOrder}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNudgeLogs(res.data.data);
            setNudgeTotal(res.data.total);
        } catch (error) { console.error("Failed to fetch nudge logs", error); } 
        finally { setLoadingNudges(false); }
    }, [nudgePage, nudgeSortBy, nudgeSortOrder]);

    const fetchActivity = useCallback(async () => {
        setLoadingActivity(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/activity?page=${activityPage}&limit=${LIMIT}&sort_by=${activitySortBy}&sort_order=${activitySortOrder}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivityStats(res.data.data);
            setActivityTotal(res.data.total);
        } catch (error) { console.error("Failed to fetch activity stats", error); } 
        finally { setLoadingActivity(false); }
    }, [activityPage, activitySortBy, activitySortOrder]);

    useEffect(() => { 
        fetchCronStatus(); 
        fetchRules(); 
        fetchNudges(); 
        fetchActivity(); 
    }, [fetchCronStatus, fetchRules, fetchNudges, fetchActivity]);

    // --- Sorting Handlers ---
    const handleNudgeSort = (field: string) => {
        if (nudgeSortBy === field) {
            setNudgeSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setNudgeSortBy(field);
            setNudgeSortOrder('ASC');
        }
    };

    const handleActivitySort = (field: string) => {
        if (activitySortBy === field) {
            setActivitySortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setActivitySortBy(field);
            setActivitySortOrder('DESC');
        }
    };

    // --- Toggles and Triggers ---
    const handleToggleCron = async () => {
        setTogglingCron(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/cron-toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus(res.data.status);
        } catch (error: any) { alert("Failed to toggle engine."); }
        setTogglingCron(false);
    };

    const handleToggleRule = async (ruleName: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/admin/engagement/rules/${ruleName}`, { is_active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
            fetchRules();
        } catch (error) { alert("Failed to update rule."); }
    };

    const handleForceFireRule = async (ruleName: string) => {
        if (!confirm(`Force trigger the "${ruleName.replace(/_/g, ' ')}" rule now?`)) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/trigger-nudges`, 
                { nudge_type: ruleName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(res.data.message);
            setTimeout(() => { setNudgePage(1); fetchNudges(); fetchRules(); setIsTriggering(false); }, 1500);
        } catch (error: any) { alert(error.response?.data?.detail || "Failed."); setIsTriggering(false); }
    };

    const handleFlushAndTrigger = async () => {
        if (!confirm("SUPERADMIN ACTION: Delete all previous logs and run fresh? This cannot be undone.")) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/flush-and-trigger`, {}, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            setTimeout(() => { setNudgePage(1); fetchNudges(); fetchRules(); setIsTriggering(false); }, 2500);
        } catch (error: any) { alert(error.response?.data?.detail || "Denied."); setIsTriggering(false); }
    };

    // --- Helpers ---
    const formatTime = (dateString: string) => {
        if (!dateString) return 'Never';
        const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        return new Date(utcString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderSortIcon = (currentSortBy: string, currentSortOrder: string, field: string) => {
        if (currentSortBy !== field) return <ArrowUp size={14} className="opacity-20 inline-block ml-1" />;
        return currentSortOrder === 'ASC' 
            ? <ArrowUp size={14} className="text-emerald-500 inline-block ml-1" />
            : <ArrowDown size={14} className="text-emerald-500 inline-block ml-1" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* --- SECTION 1: MASTER COMMAND CENTER --- */}
            {isSuperAdmin && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl transition-colors ${cronStatus === 'running' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                            <Power size={24} className={cronStatus === 'running' ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-stone-800 dark:text-white">Master Heartbeat</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-sm font-bold uppercase tracking-wider ${cronStatus === 'running' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {cronStatus === 'running' ? 'System Active' : 'System Paused'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        <button onClick={() => handleFlushAndTrigger()} disabled={isTriggering} className="flex-1 xl:flex-none px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex justify-center items-center gap-2">
                            <Trash2 size={16}/> Flush Logs
                        </button>

                        <button onClick={() => handleForceFireRule('all')} disabled={isTriggering} className="flex-1 xl:flex-none px-4 py-2.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-stone-200 dark:hover:bg-slate-700 transition flex justify-center items-center gap-2">
                            {isTriggering ? <span className="animate-pulse">Evaluating...</span> : <><Server size={16}/> Evaluate All Rules</>}
                        </button>

                        <button onClick={handleToggleCron} disabled={togglingCron} className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 text-white shadow-lg ${cronStatus === 'running' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'}`}>
                            {cronStatus === 'running' ? <><Pause size={16}/> Pause Engine</> : <><Play size={16}/> Start Engine</>}
                        </button>
                    </div>
                </div>
            )}

            {/* --- SECTION 2: RULE ENGINE GRID --- */}
            {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingRules ? (
                        <div className="col-span-full p-10 text-center text-stone-400 font-bold animate-pulse">Loading Engine Rules...</div>
                    ) : rules.map((rule) => (
                        <div key={rule.id} className={`p-5 rounded-[1.5rem] border transition-all ${rule.is_active ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30 shadow-sm' : 'bg-stone-50 dark:bg-slate-800/50 border-stone-100 dark:border-slate-800 opacity-70 grayscale-[0.3]'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${rule.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-stone-200 text-stone-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {rule.rule_name.replace(/_/g, ' ')}
                                </div>
                                
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={!!rule.is_active} onChange={() => handleToggleRule(rule.rule_name, rule.is_active)} />
                                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                            
                            <p className="text-sm text-stone-600 dark:text-slate-400 font-medium mb-5 line-clamp-3 h-12">
                                {rule.description}
                            </p>
                            
                            <div className="flex justify-between items-center pt-4 border-t border-stone-100 dark:border-slate-800">
                                <span className="text-xs text-stone-400 font-bold flex items-center gap-1.5">
                                    <Send size={14}/> {rule['30d_sends'] || 0} sends (30d)
                                </span>
                                
                                <button 
                                    onClick={() => handleForceFireRule(rule.rule_name)}
                                    disabled={isTriggering || !rule.is_active}
                                    className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Force trigger this rule now"
                                >
                                    <Zap size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- SECTION 3: AUTOMATED NUDGE LOGS --- */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Send size={20} /></div>
                    <div>
                        <h3 className="font-bold text-lg text-stone-800 dark:text-white">Automated Nudge History</h3>
                        <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Recent templates fired by the system rules.</p>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loadingNudges ? (
                        <div className="p-10 text-center text-stone-400 font-bold animate-pulse">Loading logs...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleNudgeSort('sent_at')}>
                                        Time Sent {renderSortIcon(nudgeSortBy, nudgeSortOrder, 'sent_at')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleNudgeSort('user_name')}>
                                        User {renderSortIcon(nudgeSortBy, nudgeSortOrder, 'user_name')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleNudgeSort('template_name')}>
                                        Template Name {renderSortIcon(nudgeSortBy, nudgeSortOrder, 'template_name')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleNudgeSort('trigger_reason')}>
                                        Trigger Reason {renderSortIcon(nudgeSortBy, nudgeSortOrder, 'trigger_reason')}
                                    </th>
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

            {/* --- SECTION 4: USER ACTIVITY --- */}
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
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleActivitySort('name')}>
                                        User {renderSortIcon(activitySortBy, activitySortOrder, 'name')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('total_transactions')}>
                                        <div className="flex items-center justify-center gap-1"><BarChart2 size={14}/> Total Logs {renderSortIcon(activitySortBy, activitySortOrder, 'total_transactions')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('active_days')}>
                                        <div className="flex items-center justify-center gap-1"><CalendarDays size={14}/> Active Days {renderSortIcon(activitySortBy, activitySortOrder, 'active_days')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('days_since_joining')}>
                                        <div className="flex items-center justify-center gap-1"><Clock size={14}/> Account Age {renderSortIcon(activitySortBy, activitySortOrder, 'days_since_joining')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleActivitySort('last_active_date')}>
                                        Last Active {renderSortIcon(activitySortBy, activitySortOrder, 'last_active_date')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
                                {activityStats.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-stone-400 italic">No user activity recorded yet.</td></tr>
                                ) : activityStats.map((stat) => (
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