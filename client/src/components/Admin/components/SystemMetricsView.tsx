import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Zap, Clock, XCircle, CheckCircle2, Trash2 } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

export default function SystemMetricsView() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/metrics`, { 
                headers: { Authorization: `Bearer ${token}` },
                params: { start_date: startDate || undefined, end_date: endDate || undefined }
            });
            setMetrics(res.data);
        } catch (error) { console.error("Failed to load metrics", error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchMetrics(); }, [startDate, endDate]);

    const handleTruncate = async () => {
        if (!startDate || !endDate) return alert("Please select both a Start Date and End Date to truncate data.");
        if (!confirm(`WARNING: This will permanently delete all system metrics from ${startDate} to ${endDate}. Proceed?`)) return;
        
        try {
            await axios.delete(`${API_URL}/admin/metrics`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { start_date: startDate, end_date: endDate }
            });
            alert("Metrics successfully cleared.");
            fetchMetrics();
        } catch (e: any) { alert(e.response?.data?.detail || "Failed to clear data"); }
    };

    if (loading && !metrics) return <div className="p-10 text-center text-stone-500 animate-pulse">Loading system metrics...</div>;

    const getColor = (ms: number) => {
        if (ms < 300) return 'bg-emerald-500';
        if (ms < 1000) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const renderMetricList = (data: any[] = [], maxVal: number, isTraffic = false) => {
        if (data.length === 0) return <p className="text-sm text-stone-500 italic">No data found for this period.</p>;
        return data.map((route: any, i: number) => {
            const val = isTraffic ? route.total_calls : route.avg_time_ms;
            const barWidth = Math.max((val / maxVal) * 100, 2);
            return (
                <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${route.method === 'GET' ? 'bg-blue-100 text-blue-600' : route.method === 'POST' ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>{route.method}</span>
                            <span className="truncate max-w-[200px] md:max-w-md">{route.endpoint}</span>
                        </span>
                        <span className="text-stone-500 dark:text-slate-400 font-mono text-xs flex gap-4">
                            {isTraffic ? <><span className="font-bold">{route.total_calls} calls</span><span className="opacity-50">{route.avg_time_ms}ms avg</span></> : <><span>{route.avg_time_ms}ms avg</span><span className="opacity-50">{route.total_calls} calls</span></>}
                        </span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isTraffic ? 'bg-indigo-500' : getColor(route.avg_time_ms)}`} style={{ width: `${barWidth}%` }}></div>
                    </div>
                </div>
            );
        });
    };

    const maxSlowMs = Math.max(...(metrics?.slowest?.map((m: any) => m.avg_time_ms) || [100]));
    const maxCalls = Math.max(...(metrics?.most_used?.map((m: any) => m.total_calls) || [10]));

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Filter Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm w-full md:w-auto">
                    <span className="font-bold text-stone-500">Filter:</span>
                    <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 dark:text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span className="text-stone-400 font-bold">to</span>
                    <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 dark:text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate('');}} className="text-rose-500 hover:underline text-xs font-bold px-2">Clear</button>}
                </div>
                <button onClick={handleTruncate} className="flex items-center gap-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors w-full md:w-auto justify-center">
                    <Trash2 size={16} /> Truncate Data
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-between">
                    <div><p className="text-indigo-200 font-bold text-sm uppercase tracking-wider mb-1">Total API Requests</p><h4 className="text-4xl font-black">{metrics?.pulse?.total_requests.toLocaleString() || 0}</h4></div>
                    <Activity size={48} className="text-indigo-400 opacity-50" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-stone-100 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                     <div><p className="text-stone-400 font-bold text-sm uppercase tracking-wider mb-1">Global Avg Response Time</p><h4 className={`text-4xl font-black ${getColor(metrics?.pulse?.average_time || 0).replace('bg-', 'text-')}`}>{metrics?.pulse?.average_time || 0} <span className="text-lg text-stone-300">ms</span></h4></div>
                    <Clock size={48} className="text-stone-200 dark:text-slate-800" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6">
                    <div className="mb-6 flex items-center gap-2 text-stone-800 dark:text-white"><Zap className="text-amber-500" /><h3 className="text-xl font-bold">Slowest APIs</h3></div>
                    <div className="space-y-4">{renderMetricList(metrics?.slowest, maxSlowMs, false)}</div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6">
                        <div className="mb-6 flex items-center gap-2 text-stone-800 dark:text-white"><Activity className="text-indigo-500" /><h3 className="text-xl font-bold">Highest Traffic APIs</h3></div>
                        <div className="space-y-4">{renderMetricList(metrics?.most_used, maxCalls, true)}</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 shadow-sm p-6">
                        <div className="mb-6 flex items-center gap-2 text-stone-800 dark:text-white"><XCircle className="text-rose-500" /><h3 className="text-xl font-bold">Failed Requests Tracker</h3></div>
                        <div className="space-y-2">
                            {metrics?.errors?.length === 0 ? (
                                 <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 size={16}/> No API errors found. System is healthy.</p>
                            ) : (
                                metrics?.errors?.map((err: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/50">
                                        <div className="flex items-center gap-3"><span className="text-xs font-bold bg-rose-200 text-rose-800 px-2 py-1 rounded">Error {err.status_code}</span><span className="text-sm font-medium">{err.endpoint}</span></div>
                                        <span className="text-rose-600 font-bold text-sm">{err.error_count} times</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}