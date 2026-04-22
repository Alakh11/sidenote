import { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, CalendarDays, BarChart2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Flame } from 'lucide-react';
import axios from 'axios';

export default function UserActivityRetention() {
    const LIMIT = 10;
    const API_URL = "https://api.sidenote.in";

    const getTodayStr = () => {
        const d = new Date();
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getTodayStr());
    const [endDate, setEndDate] = useState(getTodayStr());

    const [activityStats, setActivityStats] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotal, setActivityTotal] = useState(0);
    const [activitySortBy, setActivitySortBy] = useState('total_transactions');
    const [activitySortOrder, setActivitySortOrder] = useState('DESC');

    const fetchActivity = useCallback(async () => {
        setLoadingActivity(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/activity`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page: activityPage,
                    limit: LIMIT,
                    sort_by: activitySortBy,
                    sort_order: activitySortOrder,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined
                }
            });
            setActivityStats(res.data.data);
            setActivityTotal(res.data.total);
        } catch (error) { console.error("Failed to fetch activity stats", error); } 
        finally { setLoadingActivity(false); }
    }, [activityPage, activitySortBy, activitySortOrder, startDate, endDate]);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    const handleActivitySort = (field: string) => {
        if (activitySortBy === field) {
            setActivitySortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setActivitySortBy(field);
            setActivitySortOrder('DESC');
        }
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return 'Never';
        const safeString = dateString.replace(' ', 'T'); 
        
        return new Date(safeString).toLocaleString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };
    const renderSortIcon = (field: string) => {
        if (activitySortBy !== field) return <ArrowUp size={14} className="opacity-20 inline-block ml-1" />;
        return activitySortOrder === 'ASC' 
            ? <ArrowUp size={14} className="text-emerald-500 inline-block ml-1" />
            : <ArrowDown size={14} className="text-emerald-500 inline-block ml-1" />;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Activity size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg text-stone-800 dark:text-white">User Activity & Retention</h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Overview of logging habits based on transaction dates.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto text-sm">
                        <input 
                            type="date" 
                            className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none font-medium shadow-sm focus:ring-2 focus:ring-indigo-500" 
                            value={startDate} 
                            onChange={e => {setStartDate(e.target.value); setActivityPage(1);}} 
                        />
                        <span className="text-stone-400 font-bold uppercase text-xs">to</span>
                        <input 
                            type="date" 
                            className="p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none font-medium shadow-sm focus:ring-2 focus:ring-indigo-500" 
                            value={endDate} 
                            onChange={e => {setEndDate(e.target.value); setActivityPage(1);}} 
                        />
                        {(startDate || endDate) && (
                            <button 
                                onClick={() => {setStartDate(''); setEndDate(''); setActivityPage(1);}} 
                                className="text-rose-500 hover:underline text-xs font-bold px-2 ml-1"
                            >
                                Clear
                            </button>
                        )}
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
                                        User {renderSortIcon('name')}
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('total_transactions')}>
                                        <div className="flex items-center justify-center gap-1"><BarChart2 size={14}/> Total Logs {renderSortIcon('total_transactions')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('active_days')}>
                                        <div className="flex items-center justify-center gap-1"><CalendarDays size={14}/> Active Days {renderSortIcon('active_days')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('streak')}>
                                        <div className="flex items-center justify-center gap-1"><Flame size={14} className="text-rose-500"/> Streak {renderSortIcon('streak')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition text-center" onClick={() => handleActivitySort('days_since_joining')}>
                                        <div className="flex items-center justify-center gap-1"><Clock size={14}/> Account Age {renderSortIcon('days_since_joining')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-700 transition" onClick={() => handleActivitySort('last_active_date')}>
                                        Last Active {renderSortIcon('last_active_date')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-slate-800 text-sm">
                                {activityStats.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-stone-400 italic">No user activity recorded in this date range.</td></tr>
                                ) : activityStats.map((stat) => (
                                    <tr key={stat.user_id} className="hover:bg-stone-50 dark:hover:bg-slate-800/30">
                                        <td className="p-4">
                                            <p className="font-bold text-stone-800 dark:text-white">{stat.name}</p>
                                            <p className="text-xs text-stone-400">{stat.mobile}</p>
                                        </td>
                                        <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">{stat.total_transactions}</td>
                                        <td className="p-4 text-center font-bold text-stone-700 dark:text-slate-300">{stat.active_days} d</td>
                                        
                                        <td className="p-4 text-center font-black text-rose-600 dark:text-rose-400 flex justify-center items-center gap-1">
                                            {stat.streak > 1 && <Flame size={14} className="fill-rose-500" />} {stat.streak}
                                        </td>
                                        
                                        <td className="p-4 text-center font-medium text-stone-500 dark:text-slate-400">{stat.days_since_joining} d</td>
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