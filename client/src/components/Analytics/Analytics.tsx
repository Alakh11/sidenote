import { useMemo } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import { 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Target, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Analytics() {
  const { pie, bar, dailyIncome, monthlyIncome, categoryMonthly, goals } = useLoaderData({ from: '/analytics' });
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

  const gridColor = isDark ? '#334155' : '#E5E7EB';
  const axisTextColor = isDark ? '#94a3b8' : '#6B7280';
  const tooltipStyle = {
      backgroundColor: isDark ? '#1e293b' : '#fff',
      border: isDark ? '1px solid #334155' : 'none',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      color: isDark ? '#fff' : '#1f2937'
  };

  // 1. Process Data for Goals Progress
  const goalsData = useMemo(() => {
    if (!goals) return [];
    return goals.map((g: any) => ({
        name: g.name,
        Saved: g.current_amount,
        Remaining: Math.max(0, g.target_amount - g.current_amount),
        Target: g.target_amount
    }));
  }, [goals]);

  // 2. Process Data for Category-wise Monthly Stacked Bar
  const { stackedData, categories } = useMemo(() => {
    const uniqueCategories = new Set<string>();
    const grouped: any = {};

    if (categoryMonthly) {
        categoryMonthly.forEach((item: any) => {
            uniqueCategories.add(item.category);
            if (!grouped[item.month]) {
                grouped[item.month] = { name: item.month };
            }
            grouped[item.month][item.category] = item.total;
        });
    }

    return {
        stackedData: Object.values(grouped),
        categories: Array.from(uniqueCategories)
    };
  }, [categoryMonthly]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <h2 className="text-3xl font-bold text-stone-800 dark:text-white tracking-tight">Financial Analytics</h2>
      
      {/* --- Monthly Income Summary (Area Chart) --- */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                   <TrendingUp className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-bold text-stone-700 dark:text-white">Monthly Income Trend</h3>
           </div>
           
           <div className="h-72 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={[...monthlyIncome].reverse()}>
                 <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <XAxis dataKey="display_name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} tickFormatter={(value) => `₹${value/1000}k`} />
                 <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Income']}
                 />
                 <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
      </div>
      
      {/* ROW 1: Expense Pie & GOALS PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Expense Breakdown (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><PieIcon className="w-6 h-6" /></div>
               <h3 className="text-xl font-bold text-stone-700 dark:text-white">Expense Breakdown</h3>
           </div>
           <div className="h-72 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie 
                    data={pie} 
                    cx="50%" cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    stroke="none"
                 >
                   {pie.map((_: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={tooltipStyle} formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString()}`} />
                 <Legend wrapperStyle={{ color: axisTextColor }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 2. GOALS PROGRESS (Stacked Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Target className="w-6 h-6" /></div>
               <h3 className="text-xl font-bold text-stone-700 dark:text-white">Goals Progress</h3>
           </div>
           <div className="h-72 w-full min-w-0">
             {goalsData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalsData} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: axisTextColor}} />
                        <Tooltip 
                            cursor={{fill: isDark ? '#1e293b' : '#F3F4F6'}}
                            contentStyle={tooltipStyle}
                            formatter={(value: any, name?: string) => [`₹${Number(value).toLocaleString()}`, name || '']}
                        />
                        <Legend wrapperStyle={{ color: axisTextColor }} />
                        <Bar dataKey="Saved" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Remaining" stackId="a" fill={isDark ? '#334155' : '#E5E7EB'} radius={[0, 4, 4, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-slate-500">
                     <Target className="w-12 h-12 mb-2 opacity-20" />
                     <p>No goals set yet</p>
                 </div>
             )}
           </div>
        </div>
      </div>

      {/* ROW 2: Income vs Expense & Category Monthly Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* 3. Monthly Income vs Expense (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
               <h3 className="text-xl font-bold text-stone-700 dark:text-white">Income vs Expense</h3>
           </div>
           <div className="h-72 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={bar} barGap={8}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} tickFormatter={(v) => `₹${v/1000}k`} />
                 <Tooltip 
                    cursor={{fill: isDark ? '#1e293b' : '#F3F4F6'}}
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                 />
                 <Legend wrapperStyle={{ color: axisTextColor }} />
                 <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                 <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 4. Category-wise Monthly Analysis (Stacked Bar) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl"><BarChart3 className="w-6 h-6" /></div>
               <h3 className="text-xl font-bold text-stone-700 dark:text-white">Monthly Category Analysis</h3>
           </div>
           <div className="h-72 w-full min-w-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stackedData} barGap={0}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: axisTextColor}} tickFormatter={(v) => `₹${v/1000}k`} />
                 <Tooltip 
                    cursor={{fill: isDark ? '#1e293b' : '#F3F4F6'}}
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                 />
                 {categories.map((cat: string, index: number) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[index % COLORS.length]} radius={[0, 0, 0, 0]} barSize={30} />
                 ))}
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
      
      {/* Daily Income List */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-bold text-stone-700 dark:text-white mb-6">Recent Daily Income</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
               {dailyIncome.length === 0 ? (
                   <p className="text-stone-400 dark:text-slate-500 text-sm">No recent income records found.</p>
               ) : (
                   dailyIncome.map((item: any, idx: number) => (
                       <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-slate-800 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-700 transition">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-stone-400 dark:text-slate-400 shadow-sm">
                                   <Calendar className="w-4 h-4" />
                                </div>
                               <span className="font-bold text-stone-600 dark:text-slate-300 text-sm">{item.date}</span>
                           </div>
                           <span className="font-bold text-emerald-600 dark:text-emerald-400">+ ₹{item.total.toLocaleString()}</span>
                       </div>
                   ))
               )}
          </div>
      </div>

    </div>
  );
}