import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { X, Save, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  category: any;
  onClose: () => void;
  onMessage: (text: string, type: 'success' | 'error') => void;
}

export default function EditCategoryModal({ category, onClose, onMessage }: Props) {
  const router = useRouter();
  const user = router.options.context?.user!;
  const API_URL = "https://api.sidenote.in";
  const [budgetLimit, setBudgetLimit] = useState(category.budget_limit > 0 ? category.budget_limit.toString() : '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdate = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
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
      onMessage(`Budget limit for ${category.name} updated successfully.`, "success");
      onClose();
    } catch (err) { 
        setErrorMsg("Failed to save changes. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Set Limit</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-bold mt-2 flex items-center gap-2.5">
                   <span className="text-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                     {category.icon}
                   </span> 
                   {category.name}
                </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition mt-1"><X size={20} /></button>
        </div>
        
        <div className="space-y-5">
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

            {errorMsg && (
                <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <button 
                onClick={handleUpdate}
                disabled={loading}
                className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-70"
            >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save size={18} /> Save Limit</>}
            </button>
        </div>
      </div>
    </div>
  );
}