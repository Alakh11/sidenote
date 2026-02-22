import { useState } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import axios from 'axios';
import { 
  Search, Filter, X, Calendar, IndianRupee, Tag, Trash2, Repeat, CreditCard, Edit, Save 
} from 'lucide-react';
import type { Transaction } from '../../types';
import { CategoryIcon } from '../Icons/IconHelper';

export default function Transactions() {
  const router = useRouter();
  const { initialTransactions, categories } = useLoaderData({ from: '/transactions' });
  const user = router.options.context?.user;
  const API_URL = "https://sidenote-8nu4.onrender.com";

  // State
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    start_date: '',
    end_date: '',
    category_id: '',
    min_amount: '',
    max_amount: '',
    payment_mode: ''
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
        const params: any = {};
        if(filters.search) params.search = filters.search;
        if(filters.start_date) params.start_date = filters.start_date;
        if(filters.end_date) params.end_date = filters.end_date;
        if(filters.category_id) params.category_id = filters.category_id;
        if(filters.min_amount) params.min_amount = filters.min_amount;
        if(filters.max_amount) params.max_amount = filters.max_amount;
        if(filters.payment_mode) params.payment_mode = filters.payment_mode;

        const res = await axios.get(`${API_URL}/transactions/all/${user.email}`, { params });
        setTransactions(res.data);
    } catch (error) {
        console.error("Filter failed", error);
    } finally {
        setLoading(false);
    }
  };

  const clearFilters = async () => {
    if (!user?.email) return;
    setFilters({ search: '', start_date: '', end_date: '', category_id: '', min_amount: '', max_amount: '', payment_mode: '' });
    setLoading(true);
    try {
        const res = await axios.get(`${API_URL}/transactions/all/${user.email}`);
        setTransactions(res.data);
    } catch (error) {
        console.error("Reset failed", error);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Are you sure you want to delete this transaction?")) return;
      try {
          await axios.delete(`${API_URL}/transactions/${id}`);
          setTransactions(prev => prev.filter(t => t.id !== id));
          router.invalidate(); 
      } catch (e) {
          alert("Failed to delete transaction");
      }
  };

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingTx) return;

      try {
          await axios.put(`${API_URL}/transactions/${editingTx.id}`, {
              user_email: user.email,
              amount: Number(editingTx.amount),
              type: editingTx.type,
              category: editingTx.category_name, 
              date: editingTx.date.split('T')[0],
              payment_mode: editingTx.payment_mode,
              note: editingTx.note,
              is_recurring: Boolean(editingTx.is_recurring)
          });
          
          setEditingTx(null);
          router.invalidate();
          applyFilters();
          alert("Transaction Updated!");
      } catch (e) {
          alert("Failed to update transaction");
      }
  };

  const inputBaseClass = "w-full pl-10 pr-3 py-2 rounded-lg border border-stone-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-stone-800 dark:focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-stone-700 dark:text-white";
  const labelClass = "text-xs font-bold text-stone-500 dark:text-slate-400 uppercase";

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-[2rem] shadow-2xl border border-stone-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                          <Edit className="w-5 h-5 text-blue-600" /> Edit Transaction
                      </h3>
                      <button onClick={() => setEditingTx(null)} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <form onSubmit={handleUpdate} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>Amount</label>
                              <input type="number" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" value={editingTx.amount} onChange={e => setEditingTx({...editingTx, amount: e.target.value})} required />
                          </div>
                          <div>
                              <label className={labelClass}>Date</label>
                              <input type="date" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" value={editingTx.date.split('T')[0]} onChange={e => setEditingTx({...editingTx, date: e.target.value})} required />
                          </div>
                      </div>

                      <div>
                          <label className={labelClass}>Note / Description</label>
                          <input type="text" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-medium border-2 border-transparent focus:border-blue-500 outline-none" value={editingTx.note || ''} onChange={e => setEditingTx({...editingTx, note: e.target.value})} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>Category</label>
                              <select className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-medium outline-none" value={editingTx.category_name} onChange={e => setEditingTx({...editingTx, category_name: e.target.value})}>
                                  {categories.map((c: any) => (
                                      <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className={labelClass}>Payment Mode</label>
                              <select className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl font-medium outline-none" value={editingTx.payment_mode} onChange={e => setEditingTx({...editingTx, payment_mode: e.target.value})}>
                                  <option value="UPI">UPI</option>
                                  <option value="Card">Card</option>
                                  <option value="Cash">Cash</option>
                                  <option value="Net Banking">Net Banking</option>
                              </select>
                          </div>
                      </div>

                      <div className="flex bg-stone-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button type="button" onClick={() => setEditingTx({...editingTx, type: 'expense'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${editingTx.type === 'expense' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-500' : 'text-stone-400'}`}>Expense</button>
                          <button type="button" onClick={() => setEditingTx({...editingTx, type: 'income'})} className={`flex-1 py-2 rounded-lg font-bold text-sm ${editingTx.type === 'income' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-stone-400'}`}>Income</button>
                      </div>

                      <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition">
                          <Save size={18} /> Save Changes
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- Header & Search --- */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Transactions</h2>
        
        <div className="flex gap-2">
           <div className="relative flex-1 md:w-64">
               <button onClick={applyFilters} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 dark:text-slate-500 transition-colors">
                    <Search className="w-4 h-4" />
                </button>
               <input type="text" name="search" placeholder="Search note, amount, mode..." value={filters.search} onChange={handleFilterChange} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-800 dark:focus:ring-blue-500" />
           </div>
           <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`p-2.5 rounded-xl border transition-colors ${isFilterOpen ? 'bg-stone-800 text-white border-stone-800 dark:bg-blue-600' : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'}`}>
             <Filter className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* --- Expandable Filter Panel --- */}
      {isFilterOpen && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                    <label className={labelClass}>From Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className={inputBaseClass} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>To Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className={inputBaseClass} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Min Amount</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <input type="number" name="min_amount" placeholder="0" value={filters.min_amount} onChange={handleFilterChange} className={inputBaseClass} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Max Amount</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <input type="number" name="max_amount" placeholder="∞" value={filters.max_amount} onChange={handleFilterChange} className={inputBaseClass} />
                    </div>
                </div>
                <div className="md:col-span-1 lg:col-span-2 space-y-1">
                    <label className={labelClass}>Category</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <select name="category_id" value={filters.category_id} onChange={handleFilterChange} className={inputBaseClass}>
                            <option value="">All Categories</option>
                            {categories?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="md:col-span-1 lg:col-span-2 space-y-1">
                    <label className={labelClass}>Payment Mode</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-slate-500" />
                        <select name="payment_mode" value={filters.payment_mode} onChange={handleFilterChange} className={inputBaseClass}>
                            <option value="">All Modes</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cash">Cash</option>
                            <option value="Net Banking">Net Banking</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-slate-800">
                <button onClick={clearFilters} className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-2"><X className="w-4 h-4" /> Clear</button>
                <button onClick={applyFilters} disabled={loading} className="px-6 py-2 bg-stone-900 dark:bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-stone-800 transition disabled:opacity-50">{loading ? 'Filtering...' : 'Apply Filters'}</button>
            </div>
        </div>
      )}

      {/* --- TABLE UI --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-stone-50 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
             <div className="p-10 text-center text-stone-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                 <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-sm font-semibold uppercase">
                    <tr>
                       <th className="p-6 whitespace-nowrap">Category</th>
                       <th className="p-6 whitespace-nowrap">Description</th>
                       <th className="p-6 whitespace-nowrap">Date</th>
                       <th className="p-6 whitespace-nowrap">Payment</th>
                       <th className="p-6 text-right whitespace-nowrap">Amount</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-50 dark:divide-slate-800">
                    {transactions.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-10 text-center text-stone-400 dark:text-slate-500">No transactions found.</td>
                        </tr>
                    ) : (
                        transactions.map((t: Transaction) => (
                        <tr key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="p-6 whitespace-nowrap">
                                <span className="px-3 py-1 rounded-full bg-stone-100 dark:bg-slate-800 text-xs font-bold text-stone-500 dark:text-slate-300 flex items-center gap-2 w-fit">
                                    <CategoryIcon iconName={t.category_icon || 'Tag'} size={14} /> {t.category_name || t.category || 'Uncategorized'}
                                </span>
                            </td>
                            <td className="p-6 font-bold text-stone-700 dark:text-slate-200 min-w-[200px]">
                                <div className="flex items-center gap-2">
                                    {t.description || t.note || 'No Description'}
                                    {t.is_recurring === 1 ? (
                                        <div className="text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 p-1 rounded-md" title="Recurring Transaction">
                                            <Repeat className="w-3 h-3" />
                                        </div>
                                    ) : null}
                                    {t.tags && <span className="text-xs font-normal text-blue-500">#{t.tags}</span>}
                                </div>
                            </td>
                            <td className="p-6 text-stone-500 dark:text-slate-400 text-sm whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="p-6 text-stone-500 dark:text-slate-400 text-sm whitespace-nowrap font-medium">
                                <div className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-stone-400" /> {t.payment_mode || 'Cash'}</div>
                            </td>
                            <td className="p-6 text-right font-bold flex justify-end items-center gap-4 whitespace-nowrap">
                                <span className={t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-800 dark:text-slate-200'}>
                                    {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString('en-IN')}
                                </span>
                                <button onClick={() => setEditingTx(t)} className="text-stone-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition opacity-100 md:opacity-0 group-hover:opacity-100" title="Edit">
                                    <Edit size={18} />
                                </button>
                                <button 
                                onClick={() => handleDelete(t.id)} className="text-stone-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition opacity-100 md:opacity-0 group-hover:opacity-100" title="Delete">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                        ))
                    )}
                 </tbody>
              </table>
          </div>
        )}
      </div>
    </div>
  );
}