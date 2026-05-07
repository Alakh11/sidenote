import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { X, Save, RefreshCw } from 'lucide-react';

export default function EditCategoryModal({ category, onClose }: { category: any, onClose: () => void }) {
  const router = useRouter();
  const user = router.options.context?.user!;
  const API_URL = "https://api.sidenote.in";

  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  
  const [budgetLimit, setBudgetLimit] = useState(category.budget_limit > 0 ? category.budget_limit.toString() : '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/categories/${category.category_id}`, {
        name,
        icon,
        color: category.color,
        type: 'expense'
      });

      const amt = parseFloat(budgetLimit);
      if (!isNaN(amt) && amt > 0) {
          await axios.post(`${API_URL}/budgets`, {
              user_id: user.id,
              category_id: category.category_id,
              amount: amt
          });
      } else {
          await axios.delete(`${API_URL}/budgets/${category.category_id}?user_id=${user.id}`);
      }

      router.invalidate();
      onClose();
    } catch (err) { 
        alert("Failed to save changes"); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Category</h3>
                <p className="text-xs text-slate-500 mt-1">Update details or set a limit</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"><X size={20} /></button>
        </div>
        
        <div className="space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Category Name</label>
                <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-slate-800 dark:text-white font-bold border border-transparent focus:border-blue-500 transition"
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Food & Dining"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Icon (Emoji)</label>
                <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-2xl text-center border border-transparent focus:border-blue-500 transition"
                    value={icon} onChange={e => setIcon(e.target.value)}
                    placeholder="🍕"
                />
            </div>
            
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Monthly Budget Limit</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input 
                        type="number"
                        className="w-full p-4 pl-8 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-slate-800 dark:text-white font-bold border border-transparent focus:border-blue-500 transition"
                        value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                        placeholder="Leave empty for no limit"
                    />
                </div>
            </div>

            <button 
                onClick={handleUpdate}
                disabled={loading}
                className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-70"
            >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save size={18} /> Save Changes</>}
            </button>
        </div>
      </div>
    </div>
  );
}