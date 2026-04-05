import { useState } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import axios from 'axios';
import BudgetOverview from './components/BudgetOverview';
import BudgetForm from './components/BudgetForm';
import BudgetList from './components/BudgetList';
import BudgetChart from './components/BudgetChart';
import EditCategoryModal from './components/EditCategoryModal';

const API_URL = "https://api.sidenote.in";

export default function BudgetPlanner() {
  const router = useRouter();
  const { budgets, categories, history } = useLoaderData({ from: '/_auth/budget' });
  const user = router.options.context?.user!;

  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This will also remove all transactions linked to it. This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/categories/${id}`);
      router.invalidate();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete category");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Budget Planner</h2>
          
          <button 
             onClick={() => setIsAddingBudget(!isAddingBudget)}
             className="flex items-center gap-2 bg-stone-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg shadow-stone-200 dark:shadow-none"
          >
             <Plus className="w-5 h-5" /> {isAddingBudget ? 'Cancel' : 'Set Category Budget'}
          </button>
      </div>

      <BudgetOverview budgets={budgets} />

      {isAddingBudget && (
        <BudgetForm 
            categories={categories} 
            userId={user.id}
            onClose={() => setIsAddingBudget(false)} 
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BudgetList 
            budgets={budgets} 
            onDelete={handleDeleteCategory} 
            onEdit={(cat) => setEditingCategory(cat)}
          />
          <BudgetChart history={history} />
      </div>

      {editingCategory && (
        <EditCategoryModal 
          category={editingCategory} 
          onClose={() => setEditingCategory(null)} 
        />
      )}
    </div>
  );
}