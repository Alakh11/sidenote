import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Tags, Edit, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function AdminCategoriesView() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newEntry, setNewEntry] = useState({ name: '', type: 'expense', icon: '🛒', color: '#6366F1', keywords: '' });

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await axios.get("https://api.sidenote.in/admin/global-categories", {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCategories(res.data);
        } catch (error) { console.error("Failed to fetch", error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleSave = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            if (editingId) {
                await axios.put(`https://api.sidenote.in/admin/global-categories/${editingId}`, newEntry, config);
            } else {
                await axios.post("https://api.sidenote.in/admin/global-categories", newEntry, config);
            }
            handleCancel();
            fetchCategories();
        } catch (e) { alert("Failed to save category."); }
    };

    const handleEdit = (cat: any) => {
        setNewEntry({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color, keywords: cat.keywords || '' });
        setEditingId(cat.id);
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowAdd(false);
        setEditingId(null);
        setNewEntry({ name: '', type: 'expense', icon: '🛒', color: '#6366F1', keywords: '' });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <Tags className="text-indigo-500"/> Global Taxonomy
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">Manage standard categories and their WhatsApp keywords.</p>
                    </div>
                    {!showAdd && (
                        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm">
                            <Plus size={18}/> New Category
                        </button>
                    )}
                </div>

                {showAdd && (
                    <div className="bg-stone-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 mb-6">
                        <h4 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4">
                            {editingId ? <Edit size={16} className="text-indigo-500"/> : <Plus size={16} className="text-indigo-500"/>} 
                            {editingId ? 'Edit Global Category' : 'Create Global Category'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input placeholder="Category Name (e.g. Food)" className="p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2" value={newEntry.name} onChange={e => setNewEntry({...newEntry, name: e.target.value})} />
                            
                            <select className="p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newEntry.type} onChange={e => setNewEntry({...newEntry, type: e.target.value})}>
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>

                            <div className="flex gap-2">
                                <input placeholder="Icon (🍔)" className="p-3 rounded-xl border w-1/3 text-center dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" value={newEntry.icon} onChange={e => setNewEntry({...newEntry, icon: e.target.value})} maxLength={2} />
                                <input type="color" className="p-1 rounded-xl border w-2/3 h-full cursor-pointer dark:border-slate-700" value={newEntry.color} onChange={e => setNewEntry({...newEntry, color: e.target.value})} />
                            </div>

                            <textarea placeholder="Keywords (comma separated: zomato, swiggy, lunch, dinner)" className="p-3 rounded-xl border md:col-span-4 min-h-[80px] dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newEntry.keywords} onChange={e => setNewEntry({...newEntry, keywords: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={handleCancel} className="px-4 py-2 font-bold text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                                <Save size={18}/> Save Category
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
                    ) : categories.map(cat => (
                        <div key={cat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-stone-800 dark:text-white leading-tight">{cat.name}</h4>
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${cat.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{cat.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-4">
                                    {cat.keywords ? cat.keywords.split(',').map((k: string, i: number) => (
                                        <span key={i} className="text-[10px] font-bold bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 px-2 py-1 rounded-md border border-stone-200 dark:border-slate-700">
                                            {k.trim()}
                                        </span>
                                    )) : <span className="text-[10px] text-stone-400 italic">No keywords assigned</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 justify-end mt-4 pt-4 border-t border-stone-100 dark:border-slate-800">
                                <button onClick={() => handleEdit(cat)} className="text-stone-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition"><Edit size={16}/></button>
                                <button onClick={async () => { if(confirm("Delete global category?")) { await axios.delete(`https://api.sidenote.in/admin/global-categories/${cat.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); fetchCategories(); } }} className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}