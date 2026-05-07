import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { usePreferences } from '../../../context/PreferencesContext';
import { useTheme } from '../../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

export default function TrendChart({ userId }: { userId: number }) {
    const { currency } = usePreferences();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [trendView, setTrendView] = useState('month'); 
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`https://api.sidenote.in/trends/${userId}?view_by=${trendView}`)
             .then(res => setData(res.data))
             .finally(() => setLoading(false));
    }, [trendView, userId]);

    if (loading) return <div className="h-80 flex items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                        {trendView}ly Trends: Income vs Expense
                    </h3>
                </div>
                
                <div className="relative">
                    <select 
                        value={trendView} 
                        onChange={(e) => setTrendView(e.target.value)}
                        className="bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 text-sm font-bold rounded-xl pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer appearance-none"
                    >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                </div>
            </div>
            
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="period_label" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12}} tickFormatter={(val) => `${currency}${val/1000}k`} />
                        <Tooltip 
                            cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}}
                            contentStyle={{backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: '16px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'}}
                            formatter={(value: any) => [`${currency}${Number(value).toLocaleString()}`]}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Bar dataKey="income" name="Earned/Saved" fill="url(#colorIncome)" radius={[6, 6, 0, 0]} barSize={32} />
                        <Bar dataKey="expense" name="Spent" fill="url(#colorExpense)" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}