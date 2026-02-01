import { useState } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Plus, Trash2, Check, Palette, ArrowDownLeft, ArrowUpRight, Smile, Pencil, X } from 'lucide-react';

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', 
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B', '#1F2937'
];

const PRESET_ICONS = [
  '🍔', '🛒', '⛽', '🏠', '💡', '🎬', 
  '✈️', '💊', '🎓', '🎁', '💪', '👔', 
  '💰', '🏦', '📈', '🔧', '📱', '👶'
];

export default function CategoryManager() {
  const router = useRouter();
  const user = router.options.context?.user;
  const categories = useLoaderData({ from: '/categories' });

  // State
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[5], type: 'expense', icon: '🏷️' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const API_URL = "https://sidenote-7o2d.onrender.com";

  // Handle Create or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name || !user?.email) return;
    
    setLoading(true);
    try {
        if (editingId) {
            await axios.put(`${API_URL}/categories/${editingId}`, {
                name: formData.name,
                color: formData.color,
                type: formData.type,
                icon: formData.icon
            });
        } else {
            await axios.post(`${API_URL}/categories`, {
                user_email: user.email,
                name: formData.name,
                color: formData.color,
                type: formData.type,
                icon: formData.icon
            });
        }
        
        resetForm();
        router.invalidate(); 
    } catch(e) { 
        alert("Error saving category"); 
    } finally {
        setLoading(false);
    }
  };

  const deleteCategory = async (id: number) => {
      if(confirm('Delete this category? ALL associated transactions will be deleted.')) {
          try {
            await axios.delete(`${API_URL}/categories/${id}`);
            if (editingId === id) resetForm();
            router.invalidate();
          } catch (e) {
              alert("Failed to delete category");
          }
      }
  };

  const startEditing = (cat: any) => {
      setEditingId(cat.id);
      setFormData({
          name: cat.name,
          color: cat.color,
          type: cat.type,
          icon: cat.icon || '🏷️'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
      setEditingId(null);
      setFormData({ name: '', color: PRESET_COLORS[5], type: 'expense', icon: '🏷️' });
  };

  const expenseCats = categories.filter((c: any) => c.type === 'expense');
  const incomeCats = categories.filter((c: any) => c.type === 'income');

  // Styles
  const labelClass = "text-xs font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wider mb-2 block";
  const inputClass = "flex-1 p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-stone-800 dark:text-white focus:ring-2 focus:ring-stone-800 dark:focus:ring-blue-500 transition";

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-stone-900 dark:bg-blue-600 text-white rounded-xl">
                <Palette className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Category Settings</h2>
        </div>

        {/* --- FORM (Create / Edit) --- */}
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm transition-colors duration-300 ${
            editingId 
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
            : 'bg-white border-stone-50 dark:bg-slate-900 dark:border-slate-800'
        }`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`font-bold text-lg ${editingId ? 'text-blue-700 dark:text-blue-400' : 'text-stone-700 dark:text-white'}`}>
                    {editingId ? 'Edit Category' : 'Create New Category'}
                </h3>
                {editingId && (
                    <button onClick={resetForm} className="text-sm font-bold text-stone-500 dark:text-slate-400 flex items-center gap-1 hover:text-stone-800 dark:hover:text-white">
                        <X className="w-4 h-4" /> Cancel
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Type & Name */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className={labelClass}>Type</label>
                        <div className="flex bg-stone-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'expense'})}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    formData.type === 'expense' 
                                    ? 'bg-white dark:bg-slate-700 text-stone-800 dark:text-white shadow-sm' 
                                    : 'text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300'
                                }`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'income'})}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    formData.type === 'income' 
                                    ? 'bg-white dark:bg-slate-700 text-stone-800 dark:text-white shadow-sm' 
                                    : 'text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300'
                                }`}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    <div className="flex-[2]">
                        <label className={labelClass}>Category Name</label>
                        <div className="flex gap-3">
                            {/* Selected Icon Preview */}
                            <div className="w-12 h-12 bg-stone-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl border border-stone-200 dark:border-slate-700">
                                {formData.icon}
                            </div>
                            <input 
                                className={inputClass}
                                placeholder="e.g. Groceries" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* --- ICON SELECTOR --- */}
                <div>
                    <label className={`${labelClass} flex items-center gap-2`}>
                        <Smile className="w-4 h-4" /> Select Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_ICONS.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => setFormData({...formData, icon})}
                                className={`w-10 h-10 rounded-xl text-2xl transition-all flex items-center justify-center border ${
                                    formData.icon === icon 
                                    ? 'bg-stone-200 dark:bg-blue-900/50 border-stone-800 dark:border-blue-500 scale-110 shadow-sm' 
                                    : 'bg-white dark:bg-slate-800 border-stone-100 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- COLOR SELECTOR --- */}
                <div>
                    <label className={labelClass}>Select Color</label>
                    <div className="flex flex-wrap gap-3">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData({...formData, color})}
                                className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                                    formData.color === color 
                                    ? 'ring-4 ring-offset-2 ring-stone-200 dark:ring-slate-700 dark:ring-offset-slate-900 scale-110' 
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                            >
                                {formData.color === color && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                        editingId 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-stone-900 dark:bg-blue-600 text-white hover:bg-stone-800 dark:hover:bg-blue-500'
                    }`}
                >
                    {loading ? 'Saving...' : editingId ? 'Update Category' : <><Plus size={18} /> Add Category</>}
                </button>
            </form>
        </div>

        {/* --- LISTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 mb-2">
                    <ArrowUpRight className="w-5 h-5" />
                    <h3 className="font-bold text-lg uppercase tracking-wide">Expenses</h3>
                </div>
                {expenseCats.map((cat: any) => (
                    <CategoryCard key={cat.id} cat={cat} onEdit={startEditing} onDelete={deleteCategory} />
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <ArrowDownLeft className="w-5 h-5" />
                    <h3 className="font-bold text-lg uppercase tracking-wide">Income</h3>
                </div>
                {incomeCats.map((cat: any) => (
                    <CategoryCard key={cat.id} cat={cat} onEdit={startEditing} onDelete={deleteCategory} />
                ))}
            </div>
        </div>
    </div>
  );
}

// Helper Component for List Items
function CategoryCard({ cat, onEdit, onDelete }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-50 dark:border-slate-800 flex justify-between items-center group shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: cat.color }}>
                    {cat.icon || cat.name.charAt(0)}
                </div>
                <p className="font-bold text-stone-700 dark:text-slate-200">{cat.name}</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => onEdit(cat)} 
                    className="p-2 text-stone-300 hover:text-blue-500 hover:bg-blue-50 dark:text-slate-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition"
                    title="Edit Category"
                >
                    <Pencil size={18} />
                </button>
                
                <button 
                    onClick={() => onDelete(cat.id)} 
                    className="p-2 text-stone-300 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-600 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 rounded-lg transition"
                    title="Delete Category"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    )
}