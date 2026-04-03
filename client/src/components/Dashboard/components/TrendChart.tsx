import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { usePreferences } from '../../../context/PreferencesContext';
import { useTheme } from '../../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

export default function TrendChart({ userEmail }: { userEmail: string }) {
    const { viewMode, currency } = usePreferences();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`https://api.sidenote.in/trends/${userEmail}?view_by=${viewMode}`)
             .then(res => setData(res.data))
             .finally(() => setLoading(false));
    }, [viewMode, userEmail]);

    if (loading) return <div className="h-80 flex items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 capitalize">{viewMode}ly Trends: Income vs Expense</h3>
            
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