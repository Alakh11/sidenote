import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Activity, Search, Calendar, Users } from 'lucide-react';

const getColorByPercentage = (percent: number) => {
    if (percent >= 90) return 'bg-rose-500';
    if (percent >= 80) return 'bg-orange-500';
    if (percent >= 70) return 'bg-amber-500';
    if (percent >= 60) return 'bg-yellow-400';
    if (percent >= 50) return 'bg-lime-500';
    if (percent >= 40) return 'bg-emerald-500';
    if (percent >= 30) return 'bg-teal-500';
    if (percent >= 20) return 'bg-cyan-500';
    if (percent >= 10) return 'bg-blue-500';
    return 'bg-indigo-400';
};

export default function BotLogCommandHistory() {
    const [topCommands, setTopCommands] = useState<any[]>([]);
    const [dailyUsage, setDailyUsage] = useState<any[]>([]);
    const [userData, setUserData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const fetchCommandData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('https://api.sidenote.in/admin/engagement/commands', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { 
                        search: debouncedSearch || undefined,
                        start_date: startDate || undefined,
                        end_date: endDate || undefined
                    }
                });
                setTopCommands(res.data.top_commands);
                setDailyUsage(res.data.daily_usage);
                setUserData(res.data.user_data);
            } catch (error) {
                console.error("Failed to load command analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCommandData();
    }, [debouncedSearch, startDate, endDate]);

    const maxDailyUses = Math.max(...dailyUsage.map(d => d.daily_count), 1);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Filters Section */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                        type="text" 
                        placeholder="Search users by name or mobile..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto text-sm">
                    <Calendar size={16} className="text-stone-400 hidden sm:block" />
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 outline-none w-full md:w-auto text-stone-600 dark:text-slate-300" 
                    />
                    <span className="text-stone-400 font-bold">to</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 outline-none w-full md:w-auto text-stone-600 dark:text-slate-300" 
                    />
                    {(search || startDate || endDate) && (
                        <button 
                            onClick={() => {setSearch(''); setStartDate(''); setEndDate('');}} 
                            className="text-rose-500 hover:underline text-xs font-bold px-2 shrink-0"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-stone-400 animate-pulse bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800">Updating Analytics...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Commands */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Terminal size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-stone-800 dark:text-white">Most Used Commands</h3>
                            </div>

                            <div className="space-y-5">
                                {topCommands.length === 0 ? (
                                    <p className="text-stone-400 text-sm italic">No commands logged yet.</p>
                                ) : (
                                    topCommands.map((cmd, idx) => {
                                        const colorClass = getColorByPercentage(cmd.percentage);
                                        return (
                                            <div key={idx} className="group cursor-default">
                                                <div className="flex justify-between text-sm font-bold mb-2 text-stone-600 dark:text-slate-300">
                                                    <span className="uppercase tracking-wider">/{cmd.command}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-stone-400 font-medium">{cmd.usage_count} uses</span>
                                                        <span className="bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{cmd.percentage}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-stone-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                                    <div 
                                                        className={`${colorClass} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                                                        style={{ width: `${cmd.percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Daily Usage Chart */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <Activity size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-stone-800 dark:text-white">Command Usage Timeline</h3>
                            </div>

                            <div className="flex-1 flex items-end gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-slate-800 min-h-[180px]">
                                {dailyUsage.length === 0 ? (
                                    <p className="text-stone-400 text-sm italic w-full text-center mb-10">No recent activity.</p>
                                ) : (
                                    dailyUsage.map((day, idx) => {
                                        const heightPercent = (day.daily_count / maxDailyUses) * 100;
                                        const colorClass = getColorByPercentage(heightPercent); 
                                        return (
                                            <div key={idx} className="relative flex-1 flex flex-col items-center group min-w-[20px] cursor-pointer">
                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-stone-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10 pointer-events-none flex flex-col items-center">
                                                    <span>{day.daily_count} uses</span>
                                                    <span className="text-stone-400 font-normal">{Math.round(heightPercent)}% of peak</span>
                                                </div>
                                                <div className="w-full bg-stone-100 dark:bg-slate-800 rounded-t-sm h-[140px] flex items-end transition-colors group-hover:bg-stone-200 dark:group-hover:bg-slate-700">
                                                    <div 
                                                        className={`w-full ${colorClass} rounded-t-sm transition-all duration-1000 ease-out`}
                                                        style={{ height: `${heightPercent}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-stone-400 dark:text-slate-500 mt-2 truncate rotate-[-45deg] origin-top-left -ml-2">
                                                    {day.date}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Per-User Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex items-center gap-3 bg-stone-50/50 dark:bg-slate-800/50">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Users size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-stone-800 dark:text-white">Command Usage by User</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-5 w-1/3">User</th>
                                        <th className="p-5 w-1/4">Total Commands</th>
                                        <th className="p-5">Commands Used</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                                    {userData.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-stone-400 italic">No user data found for this period.</td>
                                        </tr>
                                    ) : (
                                        userData.map((user) => {
                                            const isUrl = user.profile_pic && user.profile_pic.startsWith('http');
                                            const colorClass = getColorByPercentage(user.percentage);
                                            return (
                                                <tr key={user.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="p-5 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 overflow-hidden text-lg shrink-0">
                                                            {isUrl ? <img src={user.profile_pic} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-stone-800 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">{user.name}</p>
                                                            <p className="text-xs text-stone-400">{user.mobile}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3 max-w-[200px]">
                                                            <span className="font-bold text-stone-800 dark:text-slate-200 min-w-[30px]">{user.total_commands}</span>
                                                            <div className="w-full bg-stone-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                                <div 
                                                                    className={`${colorClass} h-1.5 rounded-full`}
                                                                    style={{ width: `${user.percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {user.used_commands ? user.used_commands.split(', ').map((cmd: string, i: number) => (
                                                                <span key={i} className="bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider border border-stone-200 dark:border-slate-700">
                                                                    {cmd}
                                                                </span>
                                                            )) : <span className="text-stone-400 text-xs italic">None</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}