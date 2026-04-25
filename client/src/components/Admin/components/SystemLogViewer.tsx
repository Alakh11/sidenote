import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, RefreshCw, Copy, Trash2 } from 'lucide-react';

export default function SystemLogViewer() {
    const [logs, setLogs] = useState<string>('Initializing stream...');
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://api.sidenote.in/admin/engagement/debug-logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data.logs);
        } catch (error) {
            setLogs(prev => prev + '\n[ERROR]: Failed to fetch logs from server.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Interval logic
    useEffect(() => {
        fetchLogs();
        let interval: any;
        if (autoRefresh) {
            interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(logs);
        alert("Logs copied to clipboard");
    };
    const clearLogs = async () => {
    if(!confirm("Clear all server logs?")) return;
    try {
        const token = localStorage.getItem('token');
        await axios.delete('https://api.sidenote.in/admin/engagement/debug-logs', {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchLogs();
    } catch (e) { alert("Failed to clear logs"); }
};

    return (
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
    );
}