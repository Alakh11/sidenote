import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function RuleFormModal({ onClose, onSave, editingRule }: any) {
    const [formData, setFormData] = useState({
        rule_name: '',
        template_name: '',
        description: '',
        rule_type: 'inactivity',
        hours_min: 0,
        hours_max: 0,
        bypass_limits: false,
        is_active: true,
        variables_required: ''
    });

    useEffect(() => {
        if (editingRule) setFormData({
            ...editingRule,
            rule_type: editingRule.rule_type || 'inactivity',
            variables_required: editingRule.variables_required || ''
        });
    }, [editingRule]);

    const handleSubmit = () => onSave(formData);
    const isTimeBased = formData.rule_type === 'inactivity' || formData.rule_type === 'onboarding';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl border border-stone-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-stone-800 dark:text-white">
                        {editingRule ? 'Edit Rule' : 'Create New Rule'}
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-stone-400 ml-1">Internal Rule Name</label>
                            <input className="w-full p-3 mt-1 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={formData.rule_name} onChange={e => setFormData({...formData, rule_name: e.target.value})} placeholder="e.g., 36h_alert" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-stone-400 ml-1">Meta Template Name</label>
                            <input className="w-full p-3 mt-1 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono" value={formData.template_name} onChange={e => setFormData({...formData, template_name: e.target.value})} placeholder="sidenote_alert_v1" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-stone-400 ml-1">Description</label>
                        <textarea className="w-full p-3 mt-1 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-stone-400 ml-1">Rule Type</label>
                            <select className="w-full p-3 mt-1 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={formData.rule_type} onChange={e => setFormData({...formData, rule_type: e.target.value})}>
                                <option value="inactivity">Standard Inactivity</option>
                                <option value="onboarding">Onboarding</option>
                                <option value="weekly">Scheduled (Weekly)</option>
                                <option value="monthly">Scheduled (Monthly)</option>
                            </select>
                        </div>
                        <div className="flex items-center mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" checked={formData.bypass_limits} onChange={e => setFormData({...formData, bypass_limits: e.target.checked})} />
                                <span className="text-sm font-bold text-stone-600 dark:text-slate-300">Bypass Daily Limits</span>
                            </label>
                        </div>
                    </div>

                    {isTimeBased && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <div>
                                <label className="text-xs font-bold uppercase text-indigo-400 ml-1">Min Inactive Hours</label>
                                <input type="number" step="0.5" className="w-full p-3 mt-1 bg-white border border-indigo-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.hours_min} onChange={e => setFormData({...formData, hours_min: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-indigo-400 ml-1">Max Inactive Hours</label>
                                <input type="number" step="0.5" className="w-full p-3 mt-1 bg-white border border-indigo-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.hours_max} onChange={e => setFormData({...formData, hours_max: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="text-xs font-bold uppercase text-stone-400 ml-1">Dynamic Variables</label>
                        <input className="w-full p-3 mt-1 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm" value={formData.variables_required} onChange={e => setFormData({...formData, variables_required: e.target.value})} placeholder="[user_name, month_total, top_category]" />
                        <p className="text-[10px] text-stone-400 mt-1.5 ml-1">Available: <span className="font-mono text-indigo-400">user_name, month_total, week_total, today_total, avg_per_day, top_category, top_category_amount, last_category</span></p>
                    </div>
                </div>
                
                <button onClick={handleSubmit} className="w-full mt-6 py-4 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-200 dark:shadow-none">
                    <Save size={18} /> Save Rule
                </button>
            </div>
        </div>
    );
}