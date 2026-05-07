import { useState } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Import Components
import StatCards from './components/StatCards';
import SmartInsights from './components/SmartInsights';
import QuickAddForm from './components/QuickAddForm';
import RecentTransactions from './components/RecentTransactions';
import TrendChart from './components/TrendChart';

export default function Dashboard() {
  const router = useRouter();
  const user = router.options.context.user!;
  
  // Data Fetching
  const { totals, recent: transactions, categories, prediction, insights } = useLoaderData({ from: '/_auth/dashboard' });
  
  // Calculate Stats
  const stats = { income: 0, expense: 0, balance: 0 };
  totals.forEach((t: any) => {
    if (t.type === 'income') stats.income = Number(t.total);
    if (t.type === 'expense') stats.expense = Number(t.total);
  });
  stats.balance = stats.income - stats.expense;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const API_URL = "https://api.sidenote.in";

  // Handle Logic
  const handleAddTransaction = async (txData: any) => {
    if (!txData.amount || !txData.category) {
        setToast({ message: "Please fill in all required fields", type: "error" });
        setTimeout(() => setToast(null), 3000);
        return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/transactions`, {
        user_id: user.id,
        amount: parseFloat(txData.amount),
        type: txData.type,
        category: txData.category,
        payment_mode: txData.payment_mode,
        date: txData.date,
        note: txData.note,
        is_recurring: txData.is_recurring
      });
      
      setToast({ message: "Transaction added successfully! 🎉", type: "success" });
      router.invalidate(); 
    } catch (err) {
      setToast({ message: "Failed to add transaction. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      
      {toast && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/90 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/90 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* 1. Top Stats */}
      <StatCards stats={stats} />

      {/* 2. Insights & Predictions */}
      <SmartInsights prediction={prediction} insights={insights} />

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <QuickAddForm 
            categories={categories} 
            onAdd={handleAddTransaction} 
            isSubmitting={isSubmitting} 
        />
        
        <RecentTransactions transactions={transactions} />
      </div>
      <TrendChart userId={user.id} /> 
    </div>
  );
}