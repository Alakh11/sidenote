import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Globe, Edit, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function AdminAutoRepliesView() {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newEntry, setNewEntry] = useState({ keywords: '', text: '', buttons: '' });

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
            const payload = {
                trigger_keywords: newEntry.keywords,
                reply_text: newEntry.text,
                buttons_json: newEntry.buttons || null
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
            alert("Failed to save. Check your Button JSON format."); 
        }
    };

    const handleEdit = (reply: any) => {
        setNewEntry({
            keywords: reply.trigger_keywords,
            text: reply.reply_text,
            buttons: reply.buttons_json || ''
        });
        setEditingId(reply.id);
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowAdd(false);
        setEditingId(null);
        setNewEntry({ keywords: '', text: '', buttons: '' });
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
                        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                            <Plus size={18}/> Add Reply
                        </button>
                    )}
                </div>

                {showAdd && (
                    <div className="bg-stone-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900 mb-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-stone-800 dark:text-white">{editingId ? 'Edit Reply Rule' : 'New Reply Rule'}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                                placeholder="Keywords (comma separated: hi, hello)" 
                                className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white" 
                                value={newEntry.keywords} 
                                onChange={e => setNewEntry({...newEntry, keywords: e.target.value})} 
                            />
                            <input 
                                placeholder='Button JSON: [{"id": "cmd_menu", "title": "Menu"}]' 
                                className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs dark:bg-slate-900 dark:text-white" 
                                value={newEntry.buttons} 
                                onChange={e => setNewEntry({...newEntry, buttons: e.target.value})} 
                            />
                            <textarea 
                                placeholder="Reply message text..." 
                                className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2 min-h-[100px] dark:bg-slate-900 dark:text-white" 
                                value={newEntry.text} 
                                onChange={e => setNewEntry({...newEntry, text: e.target.value})} 
                            />
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
                                <div className="text-center p-10 text-stone-400 italic bg-stone-50 dark:bg-slate-800/50 rounded-2xl">
                                    No auto-replies configured yet.
                                </div>
                            )}
                            {replies.map(r => (
                                <div key={r.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-sm flex justify-between items-start hover:border-indigo-200 transition">
                                    <div>
                                        <div className="flex gap-2 flex-wrap mb-3">
                                            {r.trigger_keywords.split(',').map((k: string, idx: number) => (
                                                <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                                    {k.trim()}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-stone-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{r.reply_text}</p>
                                        
                                        {r.buttons_json && (
                                            <div className="mt-4 flex gap-2 flex-wrap">
                                                {JSON.parse(r.buttons_json).map((b: any, idx: number) => (
                                                    <span key={idx} className="text-[11px] font-bold bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-stone-600 dark:text-slate-400 flex items-center gap-1">
                                                        🔘 {b.title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-4">
                                        <button 
                                            onClick={() => handleEdit(r)} 
                                            className="text-indigo-500 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition"
                                            title="Edit Rule"
                                        >
                                            <Edit size={18}/>
                                        </button>
                                        <button 
                                            onClick={async () => { 
                                                if(confirm("Delete this rule?")) { 
                                                    await axios.delete(`https://api.sidenote.in/admin/auto-replies/${r.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); 
                                                    fetchReplies(); 
                                                } 
                                            }} 
                                            className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition"
                                            title="Delete Rule"
                                        >
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