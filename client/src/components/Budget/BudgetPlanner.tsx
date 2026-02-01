import { useState } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import BudgetOverview from './components/BudgetOverview';
import BudgetForm from './components/BudgetForm';
import BudgetList from './components/BudgetList';
import BudgetChart from './components/BudgetChart';

export default function BudgetPlanner() {
  const router = useRouter();
  const { budgets, categories, history } = useLoaderData({ from: '/budget' });
  const user = router.options.context?.user;

  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Budget Planner</h2>
          
          <button 
             onClick={() => setIsEditing(!isEditing)}
             className="flex items-center gap-2 bg-stone-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg shadow-stone-200 dark:shadow-none"
          >
             <Plus className="w-5 h-5" /> {isEditing ? 'Cancel' : 'Set Category Budget'}
          </button>
      </div>

      {/* Overview Cards */}
      <BudgetOverview budgets={budgets} />

      {/* Add Budget Form (Toggleable) */}
      {isEditing && (
        <BudgetForm 
            categories={categories} 
            userEmail={user.email} 
            onClose={() => setIsEditing(false)} 
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BudgetList budgets={budgets} />
          <BudgetChart history={history} />
      </div>
    </div>
  );
}