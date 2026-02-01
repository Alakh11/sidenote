import { useState } from 'react';
import { Plus, CheckCircle2, RefreshCw } from 'lucide-react';

interface Props {
  categories: any[];
  onAdd: (tx: any) => Promise<void>;
  isSubmitting: boolean;
}

export default function QuickAddForm({ categories, onAdd, isSubmitting }: Props) {
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'expense',
    category: '',
    payment_mode: 'UPI',
    note: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false
  });

  const handleSubmit = async () => {
    await onAdd(newTx);
    setNewTx({ ...newTx, amount: '', note: '', category: '', payment_mode: 'UPI' });
  };

  const filteredCats = categories.filter((c: any) => c.type === newTx.type);
  const inputClasses = "w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-700 dark:text-white";
  const labelClasses = "text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1";

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 h-fit transition-colors duration-300">
      
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
            <Plus className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Quick Add</h2>
      </div>

      <div className="space-y-5">
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setNewTx({ ...newTx, type: 'income', category: '' })}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                newTx.type === 'income' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setNewTx({ ...newTx, type: 'expense', category: '' })}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                newTx.type === 'expense' 
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Expense
          </button>
        </div>

        {/* Amount & Mode */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className={labelClasses}>Amount</label>
                <input
                    type="number"
                    placeholder="0.00"
                    className={`${inputClasses} font-bold text-lg`}
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                />
            </div>
            <div>
                <label className={labelClasses}>Payment Mode</label>
                <select 
                    value={newTx.payment_mode} 
                    onChange={e => setNewTx({ ...newTx, payment_mode: e.target.value })}
                    className={`${inputClasses} p-3.5 font-medium`}
                >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking</option>
                </select>
            </div>
        </div>

        {/* Category */}
        <div>
            <label className={labelClasses}>Category</label>
            <select 
                value={newTx.category} 
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                className={`${inputClasses} font-medium`}
            >
                <option value="" disabled>Select {newTx.type} Category</option>
                {filteredCats.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                ))}
            </select>
        </div>

        {/* Note */}
        <div>
            <label className={labelClasses}>Description</label>
            <input
                type="text"
                placeholder="e.g. Dinner with friends"
                className={`${inputClasses} font-medium`}
                value={newTx.note}
                onChange={e => setNewTx({ ...newTx, note: e.target.value })}
            />
        </div>

        {/* Date */}
        <div>
            <label className={labelClasses}>Date</label>
            <input
                type="date"
                className={`${inputClasses} font-medium text-slate-600 dark:text-slate-300`}
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
            />
        </div>

        {/* Recurring Checkbox */}
        <div 
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                newTx.is_recurring 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setNewTx({...newTx, is_recurring: !newTx.is_recurring})}
        >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                newTx.is_recurring 
                ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
            }`}>
                {newTx.is_recurring && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className={`text-sm font-semibold select-none ${
                newTx.is_recurring ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
                Recurring (Monthly)
            </span>
        </div>

        <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Transaction'}
        </button>
      </div>
    </div>
  );
}