import { useState } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';

// Import Components
import StatCards from './components/StatCards';
import SmartInsights from './components/SmartInsights';
import QuickAddForm from './components/QuickAddForm';
import RecentTransactions from './components/RecentTransactions';

export default function Dashboard() {
  const router = useRouter();
  const user = router.options.context.user;
  
  // Data Fetching
  const { totals, recent: transactions, categories, prediction, insights } = useLoaderData({ from: '/dashboard' });
  
  // Calculate Stats
  const stats = { income: 0, expense: 0, balance: 0 };
  totals.forEach((t: any) => {
    if (t.type === 'income') stats.income = Number(t.total);
    if (t.type === 'expense') stats.expense = Number(t.total);
  });
  stats.balance = stats.income - stats.expense;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_URL = "https://sidenote-q60v.onrender.com";

  // Handle Logic
  const handleAddTransaction = async (txData: any) => {
    if (!txData.amount || !txData.category) {
        alert("Please fill in amount and category");
        return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/transactions`, {
        user_email: user.email,
        amount: parseFloat(txData.amount),
        type: txData.type,
        category: txData.category,
        payment_mode: txData.payment_mode,
        date: txData.date,
        note: txData.note,
        is_recurring: txData.is_recurring
      });
      
      // Refresh Data
      router.invalidate(); 
    } catch (err) {
      alert("Error adding transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
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
    </div>
  );
}