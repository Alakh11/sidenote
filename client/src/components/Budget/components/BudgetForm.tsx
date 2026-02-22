import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';

interface Props {
  categories: any[];
  onClose: () => void;
  userEmail: string;
}

export default function BudgetForm({ categories, onClose, userEmail }: Props) {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const API_URL = "https://sidenote-8nu4.onrender.com";

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !amount) return;
    setLoading(true);

    try {
        await axios.post(`${API_URL}/budgets`, {
            user_email: userEmail,
            category_id: parseInt(selectedCat),
            amount: parseFloat(amount)
        });
        setAmount('');
        router.invalidate(); 
        onClose();
    } catch (error) {
        alert("Failed to save budget");
    } finally {
        setLoading(false);
    }
  };

  const inputClasses = "flex-1 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl px-4 py-3 text-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-100 dark:border-slate-800 animate-in slide-in-from-top-4 mb-8 transition-colors duration-300">
        
        <h3 className="font-bold text-lg mb-4 text-stone-800 dark:text-white">Set Monthly Limit</h3>
        
        <form onSubmit={handleSaveBudget} className="flex flex-col md:flex-row gap-4">
            <select 
               value={selectedCat} 
               onChange={(e) => setSelectedCat(e.target.value)}
               className={inputClasses}
               required
            >
                <option value="">Select Category</option>
                {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
            </select>
            
            <input 
               type="number" 
               placeholder="Amount (e.g. 5000)" 
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               className={inputClasses}
               required
            />
            
            <button 
                type="submit" 
                disabled={loading}
                className="bg-stone-900 dark:bg-blue-600 text-white hover:bg-stone-800 dark:hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-lg dark:shadow-none"
            >
                {loading ? 'Saving...' : 'Save Limit'}
            </button>
        </form>
    </div>
  );
}