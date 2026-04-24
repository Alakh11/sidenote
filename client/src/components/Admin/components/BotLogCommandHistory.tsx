import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Activity } from 'lucide-react';

export default function CommandAnalyticsPanel() {
    const [topCommands, setTopCommands] = useState<any[]>([]);
    const [dailyUsage, setDailyUsage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCommandData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('https://api.sidenote.in/admin/engagement/commands', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTopCommands(res.data.top_commands);
                setDailyUsage(res.data.daily_usage);
            } catch (error) {
                console.error("Failed to load command analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCommandData();
    }, []);

    const maxDailyUses = Math.max(...dailyUsage.map(d => d.daily_count), 1);

    if (loading) {
        return <div className="h-64 flex items-center justify-center text-stone-400 animate-pulse bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800">Loading Command Insights...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            
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
                        topCommands.map((cmd, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between text-sm font-bold mb-2 text-stone-600 dark:text-slate-300">
                                    <span className="uppercase tracking-wider">/{cmd.command}</span>
                                    <span>{cmd.usage_count} uses</span>
                                </div>
                                <div className="w-full bg-stone-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 hover:bg-indigo-400 h-2.5 rounded-full transition-all duration-500" 
                                        style={{ width: `${cmd.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Activity size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 dark:text-white">Command Usage (Last 14 Days)</h3>
                </div>

                <div className="flex-1 flex items-end gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-slate-800 min-h-[180px]">
                    {dailyUsage.length === 0 ? (
                        <p className="text-stone-400 text-sm italic w-full text-center mb-10">No recent activity.</p>
                    ) : (
                        dailyUsage.map((day, idx) => {
                            const heightPercent = (day.daily_count / maxDailyUses) * 100;
                            return (
                                <div key={idx} className="relative flex-1 flex flex-col items-center group">
                                    {/* Tooltip on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-stone-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                        {day.daily_count} uses
                                    </div>
                                    
                                    {/* Vertical Bar */}
                                    <div className="w-full bg-stone-100 dark:bg-slate-800 rounded-t-sm h-[140px] flex items-end">
                                        <div 
                                            className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all duration-500"
                                            style={{ height: `${heightPercent}%` }}
                                        ></div>
                                    </div>
                                    
                                    {/* X-Axis Label */}
                                    <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 mt-2 truncate rotate-[-45deg] origin-top-left -ml-2">
                                        {day.date}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

        </div>
    );
}