import { useState, useEffect } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import axios from 'axios';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import BudgetOverview from './components/BudgetOverview';
import BudgetList from './components/BudgetList';
import BudgetChart from './components/BudgetChart';
import EditCategoryModal from './components/EditCategoryModal';

const API_URL = "https://api.sidenote.in";

export default function BudgetPlanner() {
  const router = useRouter();
  const { budgets, history } = useLoaderData({ from: '/_auth/budget' });
  const user = router.options.context?.user!;

  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (statusMessage) {
        const timer = setTimeout(() => setStatusMessage(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleRemoveBudget = async (categoryId: number, name: string) => {
    if (!window.confirm(`Remove the budget limit for "${name}"? Your transactions and category will NOT be deleted.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/budgets/${categoryId}?user_id=${user.id}`);
      setStatusMessage({ text: `Budget limit for ${name} removed successfully.`, type: 'success' });
      router.invalidate();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || "Failed to remove budget limit.", type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Budget Planner</h2>
      </div>

      {statusMessage && (
          <div className={`flex items-center justify-between p-4 rounded-2xl border animate-in slide-in-from-top-2 fade-in duration-300 ${
              statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'
          }`}>
              <div className="flex items-center gap-3">
                  {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span className="font-bold text-sm tracking-wide">{statusMessage.text}</span>
              </div>
              <button 
                  onClick={() => setStatusMessage(null)} 
                  className="opacity-60 hover:opacity-100 transition-opacity"
              >
                  <X size={18} />
              </button>
          </div>
      )}

      <BudgetOverview budgets={budgets} />

      <div className="flex flex-col gap-8">
          
          
          <BudgetList 
            budgets={budgets} 
            onDelete={handleRemoveBudget} 
            onEdit={(cat) => setEditingCategory(cat)}
          />
          <BudgetChart history={history} />
      </div>

      {editingCategory && (
        <EditCategoryModal 
          category={editingCategory} 
          onClose={() => setEditingCategory(null)} 
          onMessage={(text, type) => setStatusMessage({ text, type })}
        />
      )}
    </div>
  );
}