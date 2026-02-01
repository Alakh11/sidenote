import { Repeat } from 'lucide-react';

interface Props {
  total: number;
  count: number;
}

export default function RecurringHeader({ total, count }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-3">
                Recurring Bills
            </h2>
            <p className="text-stone-500 dark:text-slate-400 mt-1">
                Manage subscriptions, rent, and regular payments.
            </p>
        </div>
        
        {count > 0 && (
            <div className="bg-stone-900 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-stone-200 dark:shadow-blue-900/20 flex items-center gap-3 transition-colors">
                <div className="p-2 bg-stone-800 dark:bg-blue-500 rounded-lg">
                    <Repeat className="w-5 h-5 text-emerald-400 dark:text-white" />
                </div>
                <div>
                    <p className="text-xs text-stone-400 dark:text-blue-200 font-bold uppercase">Monthly Total</p>
                    <p className="text-xl font-bold">₹{total.toLocaleString()}</p>
                </div>
            </div>
        )}
    </div>
  );
}