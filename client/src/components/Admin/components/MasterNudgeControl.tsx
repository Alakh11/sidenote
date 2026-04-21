import { Play, Pause, Server, Power, Trash2 } from 'lucide-react';

export default function MasterNudgeControl({ cronStatus, togglingCron, isTriggering, onToggleCron, onForceFireAll, onFlushAndTrigger }: any) {
    return (
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
                <button onClick={onFlushAndTrigger} disabled={isTriggering} className="flex-1 xl:flex-none px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex justify-center items-center gap-2">
                    <Trash2 size={16}/> Flush Logs
                </button>

                <button onClick={onForceFireAll} disabled={isTriggering} className="flex-1 xl:flex-none px-4 py-2.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-stone-200 dark:hover:bg-slate-700 transition flex justify-center items-center gap-2">
                    {isTriggering ? <span className="animate-pulse">Evaluating...</span> : <><Server size={16}/> Evaluate All Rules</>}
                </button>

                <button onClick={onToggleCron} disabled={togglingCron} className={`flex-1 xl:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 text-white shadow-lg ${cronStatus === 'running' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'}`}>
                    {cronStatus === 'running' ? <><Pause size={16}/> Pause Engine</> : <><Play size={16}/> Start Engine</>}
                </button>
            </div>
        </div>
    );
}