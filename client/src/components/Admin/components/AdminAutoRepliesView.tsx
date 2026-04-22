import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Globe, Edit, Loader2, AlertTriangle, PlusCircle, X } from 'lucide-react';
import axios from 'axios';

const SYSTEM_ACTIONS = [
    { id: 'cmd_menu', label: 'Open Main Menu' },
    { id: 'cmd_summary', label: 'Show Summary' },
    { id: 'cmd_today', label: 'Show Today Logs' },
    { id: 'cmd_week', label: 'Show This Week' },
    { id: 'cmd_month', label: 'Show This Month' },
    { id: 'cmd_help', label: 'Show Help Tips' },
];

export default function AdminAutoRepliesView() {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    
    const [newEntry, setNewEntry] = useState<{keywords: string, text: string, buttons: {id: string, title: string}[]}>({ 
        keywords: '', 
        text: '', 
        buttons: [] 
    });

    const fetchReplies = async () => {
        setLoading(true);
        try {
            const res = await axios.get("https://api.sidenote.in/admin/auto-replies", {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setReplies(res.data);
        } catch (error) {
            console.error("Failed to fetch replies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReplies(); }, []);

    const handleSave = async () => {
        try {
            const validButtons = newEntry.buttons.filter(b => b.title.trim() !== '' && b.id.trim() !== '');
            const finalButtonsJson = validButtons.length > 0 ? JSON.stringify(validButtons) : null;
            const payload = {
                trigger_keywords: newEntry.keywords,
                reply_text: newEntry.text,
                buttons_json: finalButtonsJson
            };
            
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (editingId) {
                await axios.put(`https://api.sidenote.in/admin/auto-replies/${editingId}`, payload, config);
            } else {
                await axios.post("https://api.sidenote.in/admin/auto-replies", payload, config);
            }
            
            handleCancel();
            fetchReplies();
        } catch (e) { 
            alert("Failed to save the rule."); 
        }
    };

    const handleEdit = (reply: any) => {
        let parsedButtons = [];
        if (reply.buttons_json) {
            try { parsedButtons = JSON.parse(reply.buttons_json); } catch(e) {}
        }

        setNewEntry({
            keywords: reply.trigger_keywords,
            text: reply.reply_text,
            buttons: parsedButtons
        });
        setEditingId(reply.id);
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowAdd(false);
        setEditingId(null);
        setNewEntry({ keywords: '', text: '', buttons: [] });
    };

    const addBtn = () => {
        if (newEntry.buttons.length >= 3) return;
        setNewEntry({...newEntry, buttons: [...newEntry.buttons, {id: 'cmd_menu', title: ''}]});
    };

    const updateBtn = (index: number, field: 'id' | 'title', val: string) => {
        const btns = [...newEntry.buttons];
        btns[index][field] = val;
        setNewEntry({...newEntry, buttons: btns});
    };

    const removeBtn = (index: number) => {
        const btns = newEntry.buttons.filter((_, i) => i !== index);
        setNewEntry({...newEntry, buttons: btns});
    };

    const renderButtons = (jsonString: string) => {
        if (!jsonString) return null;
        try {
            const parsed = JSON.parse(jsonString);
            if (!Array.isArray(parsed)) throw new Error("Not an array");
            return (
                <div className="mt-4 flex gap-2 flex-wrap">
                    {parsed.map((b: any, idx: number) => (
                        <span key={idx} className="text-[11px] font-bold bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-stone-600 dark:text-slate-400 flex items-center gap-1 shadow-sm">
                            🔘 {b.title || 'Unnamed'} <span className="text-stone-400 font-normal ml-1 border-l border-stone-300 dark:border-slate-600 pl-1">{b.id}</span>
                        </span>
                    ))}
                </div>
            );
        } catch (e) {
            return (
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                    <AlertTriangle size={12} /> Invalid Button format. Please edit to fix.
                </div>
            );
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <Globe className="text-indigo-500"/> Conversational AI
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">Manage keyword triggers and automated replies.</p>
                    </div>
                    {!showAdd && (
                        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Plus size={18}/> Add Reply
                        </button>
                    )}
                </div>

                {showAdd && (
                    <div className="bg-stone-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 mb-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-stone-800 dark:text-white flex items-center gap-2">
                                {editingId ? <Edit size={16} className="text-indigo-500"/> : <Plus size={16} className="text-indigo-500"/>} 
                                {editingId ? 'Edit Reply Rule' : 'New Reply Rule'}
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <input 
                                placeholder="Keywords (comma separated: hi, hello, greetings)" 
                                className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white" 
                                value={newEntry.keywords} 
                                onChange={e => setNewEntry({...newEntry, keywords: e.target.value})} 
                            />
                            
                            <textarea 
                                placeholder="The message text that the bot will reply with..." 
                                className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] dark:bg-slate-900 dark:text-white" 
                                value={newEntry.text} 
                                onChange={e => setNewEntry({...newEntry, text: e.target.value})} 
                            />

                            {/* --- VISUAL BUTTON BUILDER --- */}
                            <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl">
                                <label className="text-sm font-bold text-stone-700 dark:text-slate-300 block mb-3">Interactive Buttons (Max 3)</label>
                                
                                {newEntry.buttons.map((btn, idx) => {
                                    const isCustom = !SYSTEM_ACTIONS.some(a => a.id === btn.id);
                                    
                                    return (
                                    <div key={idx} className="flex flex-col md:flex-row gap-2 mb-3 items-center bg-stone-50 dark:bg-slate-800 p-2 rounded-lg border border-stone-100 dark:border-slate-700">
                                        <input 
                                            placeholder="Button Text (e.g. Main Menu)" 
                                            value={btn.title} 
                                            onChange={(e) => updateBtn(idx, 'title', e.target.value)} 
                                            className="w-full md:w-1/3 p-2 text-sm rounded-lg border border-stone-200 dark:border-slate-600 dark:bg-slate-950 dark:text-white outline-none" 
                                            maxLength={20}
                                        />
                                        <div className="flex gap-2 w-full md:w-2/3">
                                            <select 
                                                value={isCustom ? 'custom' : btn.id} 
                                                onChange={(e) => {
                                                    if (e.target.value !== 'custom') updateBtn(idx, 'id', e.target.value);
                                                    else updateBtn(idx, 'id', 'custom_keyword');
                                                }}
                                                className="w-full p-2 text-sm rounded-lg border border-stone-200 dark:border-slate-600 dark:bg-slate-950 dark:text-white outline-none"
                                            >
                                                {SYSTEM_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                                <option value="custom">Custom Keyword...</option>
                                            </select>
                                            
                                            {isCustom && (
                                                <input 
                                                    placeholder="Keyword ID" 
                                                    value={btn.id} 
                                                    onChange={(e) => updateBtn(idx, 'id', e.target.value)} 
                                                    className="w-full p-2 text-sm rounded-lg border border-stone-200 dark:border-slate-600 dark:bg-slate-950 dark:text-white outline-none" 
                                                />
                                            )}
                                            <button onClick={() => removeBtn(idx)} className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition shrink-0"><X size={18}/></button>
                                        </div>
                                    </div>
                                )})}

                                {newEntry.buttons.length < 3 && (
                                    <button onClick={addBtn} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-2 hover:underline">
                                        <PlusCircle size={14}/> Add a button
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={handleCancel} className="px-4 py-2 font-bold text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                                <Save size={18}/> {editingId ? 'Update Rule' : 'Save Rule'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-12 text-indigo-500">
                            <Loader2 className="animate-spin w-8 h-8" />
                        </div>
                    ) : (
                        <>
                            {replies.length === 0 && !showAdd && (
                                <div className="text-center p-10 text-stone-400 italic bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-800">
                                    No conversational rules configured yet.
                                </div>
                            )}
                            {replies.map(r => (
                                <div key={r.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-sm flex justify-between items-start hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                                    <div className="w-full pr-4">
                                        <div className="flex gap-2 flex-wrap mb-3">
                                            {r.trigger_keywords.split(',').map((k: string, idx: number) => (
                                                <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                                    {k.trim()}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-stone-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">{r.reply_text}</p>
                                        {renderButtons(r.buttons_json)}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => handleEdit(r)} className="text-stone-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition" title="Edit Rule">
                                            <Edit size={18}/>
                                        </button>
                                        <button onClick={async () => { if(confirm("Delete this rule permanently?")) { await axios.delete(`https://api.sidenote.in/admin/auto-replies/${r.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); fetchReplies(); } }} className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition" title="Delete Rule">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}