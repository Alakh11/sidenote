import { Send, Zap } from 'lucide-react';

export default function RuleEngineGrid({ rules, loadingRules, isTriggering, onToggleRule, onForceFireRule }: any) {
    if (loadingRules) {
        return <div className="p-10 text-center text-stone-400 font-bold animate-pulse w-full">Loading Engine Rules...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule: any) => (
                <div key={rule.id} className={`p-5 rounded-[1.5rem] border transition-all ${rule.is_active ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30 shadow-sm' : 'bg-stone-50 dark:bg-slate-800/50 border-stone-100 dark:border-slate-800 opacity-70 grayscale-[0.3]'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${rule.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-stone-200 text-stone-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {rule.rule_name.replace(/_/g, ' ')}
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!rule.is_active} onChange={() => onToggleRule(rule.rule_name, rule.is_active)} />
                            <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                    
                    <p className="text-sm text-stone-600 dark:text-slate-400 font-medium mb-5 line-clamp-3 h-12">
                        {rule.description}
                    </p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-stone-100 dark:border-slate-800">
                        <span className="text-xs text-stone-400 font-bold flex items-center gap-1.5">
                            <Send size={14}/> {rule['30d_sends'] || 0} sends (30d)
                        </span>
                        
                        <button 
                            onClick={() => onForceFireRule(rule.rule_name)}
                            disabled={isTriggering || !rule.is_active}
                            className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Force trigger this rule now"
                        >
                            <Zap size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}