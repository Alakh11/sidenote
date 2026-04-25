import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, RefreshCw, Copy, Trash2 } from 'lucide-react';
import MasterNudgeControl from './MasterNudgeControl';

const API_URL = "https://api.sidenote.in";

export default function SystemLogViewer() {
    const [logs, setLogs] = useState<string>('Initializing stream...');
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [cronStatus, setCronStatus] = useState<{status: 'running' | 'paused' | 'offline', next_run: string | null}>({ status: 'offline', next_run: null });
    const [togglingCron, setTogglingCron] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);

    const formatTime = (dateString: string) => {
        if (!dateString || dateString === 'None' || dateString === 'Paused') return 'N/A';
        const safeString = dateString.replace(' ', 'T');
        return new Date(safeString).toLocaleString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    // --- API Handlers ---
    const fetchLogs = async () => {
        if (logs === 'Initializing stream...') setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/debug-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data.logs || 'Log file is currently empty. Waiting for engine activity...');
        } catch (error) {
            setLogs(prev => prev + '\n[ERROR]: Failed to fetch logs from server.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCronStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/cron-status`, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus({ status: res.data.status, next_run: res.data.next_run });
        } catch (error) { }
    };

    const handleToggleCron = async () => {
        setTogglingCron(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/cron-toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus({ status: res.data.status, next_run: res.data.next_run });
        } catch (error: any) { alert("Failed to toggle engine."); }
        setTogglingCron(false);
    };

    const handleForceFireAll = async () => {
        if (!confirm(`Force trigger the "all" rules now?`)) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/trigger-nudges`, { nudge_type: "all" }, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            fetchLogs(); // Instantly refresh logs to show it started
            setTimeout(() => { setIsTriggering(false); }, 1500);
        } catch (error: any) { alert(error.response?.data?.detail || "Failed."); setIsTriggering(false); }
    };

    const handleFlushAndTrigger = async () => {
        if (!confirm("ADMIN ACTION: Delete all previous logs and run fresh? This cannot be undone.")) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/flush-and-trigger`, {}, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            fetchLogs(); // Instantly refresh logs
            setTimeout(() => { setIsTriggering(false); }, 2500);
        } catch (error: any) { alert(error.response?.data?.detail || "Denied."); setIsTriggering(false); }
    };

    const clearLogs = async () => {
        if(!confirm("Clear all server logs?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/admin/engagement/debug-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLogs();
        } catch (e) { alert("Failed to clear logs"); }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(logs);
        alert("Logs copied to clipboard");
    };

    // --- Effects ---
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    useEffect(() => {
        fetchLogs();
        fetchCronStatus();
    }, []);

    useEffect(() => {
        let interval: any;
        if (autoRefresh) {
            interval = setInterval(() => {
                fetchLogs();
            }, 10000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Master Control Section */}
            <div className="relative">
                {cronStatus.next_run && cronStatus.status === 'running' && (
                    <div className="flex justify-end mb-2">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 px-3 py-1 rounded-full font-mono shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Next run: {formatTime(cronStatus.next_run)}
                        </span>
                    </div>
                )}
                
                <MasterNudgeControl
                    cronStatus={cronStatus.status as any} 
                    togglingCron={togglingCron}
                    isTriggering={isTriggering}
                    onToggleCron={handleToggleCron}
                    onForceFireAll={handleForceFireAll}
                    onFlushAndTrigger={handleFlushAndTrigger}
                />
            </div>

            {/* Terminal Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
                {/* Header */}
                <div className="p-5 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between bg-stone-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 text-slate-200 rounded-lg">
                            <Terminal size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-800 dark:text-white">Live Engine Logs</h3>
                            <p className="text-[10px] text-stone-400 font-mono uppercase tracking-widest">logs/nudge_engine.log</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${autoRefresh ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-stone-100 text-stone-400 dark:bg-slate-800'}`}
                        >
                            {autoRefresh ? 'Auto-Refresh ON' : 'Paused'}
                        </button>
                        <button onClick={fetchLogs} className="p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={copyToClipboard} className="p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg">
                            <Copy size={16} />
                        </button>
                        <button onClick={clearLogs} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="flex-1 bg-slate-950 p-4 overflow-y-auto font-mono text-xs leading-relaxed custom-scrollbar">
                    {logs.split('\n').map((line, i) => (
                        <div key={i} className="group flex gap-3 mb-0.5">
                            <span className="text-slate-700 select-none w-8 shrink-0">{i + 1}</span>
                            <span className={`
                                ${line.includes('ERROR') ? 'text-rose-400' : 
                                  line.includes('INFO') ? 'text-sky-400' : 
                                  line.includes('Fired') ? 'text-emerald-400' : 'text-slate-300'}
                            `}>
                                {line}
                            </span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>

                {/* Footer Status */}
                <div className="px-5 py-3 bg-stone-50 dark:bg-slate-800/50 border-t border-stone-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase">Worker Connected</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 italic">Showing last 150 lines</span>
                </div>
            </div>
        </div>
    );
}