import { useState } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Repeat } from 'lucide-react';
import type { Transaction } from '../../types';
import RecurringHeader from './components/RecurringHeader';
import RecurringCard from './components/RecurringCard';

export default function Recurring() {
  const router = useRouter();
  const user = router.options.context?.user;
  const recurring = useLoaderData({ from: '/recurring' });
  
  const [processingId, setProcessingId] = useState<number | null>(null);
  const API_URL = "https://sidenote-7o2d.onrender.com";

  const totalRecurring = recurring.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  const processPayment = async (tx: Transaction) => {
      setProcessingId(tx.id);
      try {
        await axios.post(`${API_URL}/transactions`, {
            user_email: user.email,
            amount: tx.amount,
            type: tx.type,
            category: tx.category,
            payment_mode: tx.payment_mode || "Card",
            date: new Date().toISOString().split('T')[0],
            note: tx.note,
            is_recurring: true
        });
        
        setTimeout(() => {
            alert(`✅ Recorded payment for ${tx.note}!`);
            router.invalidate();
            setProcessingId(null);
        }, 500);

      } catch (error) {
          alert("Failed to process payment");
          setProcessingId(null);
      }
  };

  const stopRecurring = async (id: number) => {
      if(confirm("Stop this recurring bill? It will be removed from this list.")) {
          try {
            await axios.delete(`${API_URL}/recurring/stop/${id}`);
            router.invalidate();
          } catch (e) {
              alert("Failed to stop recurring bill");
          }
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* 1. Header & Summary */}
        <RecurringHeader total={totalRecurring} count={recurring.length} />

        {/* 2. Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recurring.map((tx: any) => (
                <RecurringCard 
                    key={tx.id} 
                    tx={tx} 
                    onPay={processPayment} 
                    onStop={stopRecurring}
                    isProcessing={processingId === tx.id}
                />
            ))}
            
            {/* Empty State */}
            {recurring.length === 0 && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 border-dashed">
                    <div className="w-16 h-16 bg-stone-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Repeat className="w-8 h-8 text-stone-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-600 dark:text-slate-300">No recurring bills set</h3>
                    <p className="text-stone-400 dark:text-slate-500 text-sm mt-1 max-w-xs text-center">
                        Add a transaction with the <b>"Recurring"</b> checkbox enabled to track your subscriptions here.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
}