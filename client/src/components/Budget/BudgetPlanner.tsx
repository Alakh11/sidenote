import { useState } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import axios from 'axios';
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

  const handleRemoveBudget = async (categoryId: number, name: string) => {
    if (!window.confirm(`Remove the budget limit for "${name}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/budgets/${categoryId}?user_id=${user.id}`);
      router.invalidate();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove budget limit");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Budget Planner</h2>
      </div>

      <BudgetOverview budgets={budgets} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
        />
      )}
    </div>
  );
}