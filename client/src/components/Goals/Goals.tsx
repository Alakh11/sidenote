import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Plus, Trophy, Trash2, TrendingUp, Minus, X, Check, History, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { differenceInMonths, differenceInDays, parseISO } from 'date-fns';

interface Goal {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
}

export default function Goals() {
  const router = useRouter();
  const user = router.options.context.user;
  const { goals } = useLoaderData({ from: '/goals' });

  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' });
  
  const [activeAction, setActiveAction] = useState<{ id: number, type: 'add' | 'withdraw', name: string } | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const API_URL = "https://sidenote-q60v.onrender.com";

  useEffect(() => {
      if (activeAction && inputRef.current) {
          inputRef.current.focus();
      }
  }, [activeAction]);

  const createGoal = async () => {
     if(!newGoal.name || !newGoal.target) return;
     await axios.post(`${API_URL}/goals`, {
        user_email: user.email,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target),
        deadline: newGoal.deadline || null
     });
     setShowForm(false);
     setNewGoal({ name: '', target: '', deadline: '' });
     router.invalidate();
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!activeAction || !amountInput) return;
      const amount = parseFloat(amountInput);
      const finalAmount = activeAction.type === 'withdraw' ? -amount : amount;
      
      try {
          await axios.put(`${API_URL}/goals/add-money`, { goal_id: activeAction.id, amount_added: finalAmount });
          setActiveAction(null);
          setAmountInput('');
          router.invalidate();
      } catch (error) { alert("Failed to update amount"); }
  };

  const deleteGoal = async (id: number) => {
      if(confirm("Delete this goal?")) {
          await axios.delete(`${API_URL}/goals/${id}`);
          router.invalidate();
      }
  };

  const openHistory = async (goal: Goal) => {
      setHistoryGoal(goal);
      setLoadingHistory(true);
      try {
          const res = await axios.get(`${API_URL}/goals/${goal.id}/history`);
          setHistoryData(res.data);
      } catch(e) { alert("Failed to fetch history"); }
      setLoadingHistory(false);
  };

  // --- HELPERS ---
  const getSuggestion = (goal: Goal) => {
      if (!goal.deadline) return null;
      if (goal.current_amount >= goal.target_amount) return "Goal Reached! 🎉";
      const monthsLeft = differenceInMonths(parseISO(goal.deadline), new Date());
      const remaining = goal.target_amount - goal.current_amount;
      if (monthsLeft <= 0) return "Deadline passed";
      const monthly = Math.ceil(remaining / monthsLeft);
      return `Save ₹${monthly.toLocaleString()}/mo to hit target`;
  };

  const getDaysLeft = (dateStr?: string) => {
      if(!dateStr) return null;
      const days = differenceInDays(parseISO(dateStr), new Date());
      return days > 0 ? `${days} days left` : 'Due today';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
       
       {/* --- TRANSACTION MODAL --- */}
       {activeAction && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl border border-stone-100 dark:border-slate-800 animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-4">
                       <div>
                           <h3 className="font-bold text-lg text-stone-800 dark:text-white capitalize">{activeAction.type} Money</h3>
                           <p className="text-xs text-stone-500 dark:text-slate-400">For: {activeAction.name}</p>
                       </div>
                       <button onClick={() => { setActiveAction(null); setAmountInput(''); }} className="p-2 bg-stone-100 dark:bg-slate-800 rounded-full hover:bg-stone-200 dark:hover:bg-slate-700"><X size={18} /></button>
                   </div>
                   <form onSubmit={handleTransactionSubmit}>
                       <div className="relative mb-4">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                           <input 
                                ref={inputRef} 
                                type="number" 
                                placeholder="0" 
                                className="w-full pl-8 pr-4 py-4 bg-stone-50 dark:bg-slate-800 rounded-2xl text-2xl font-bold text-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                value={amountInput} 
                                onChange={e => setAmountInput(e.target.value)} 
                           />
                       </div>
                       <button type="submit" className={`w-full py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 ${activeAction.type === 'add' ? 'bg-stone-900 dark:bg-blue-600' : 'bg-stone-900 dark:bg-blue-600'}`}>
                           <Check size={18} /> Confirm
                       </button>
                   </form>
               </div>
           </div>
       )}

       {/* --- HISTORY MODAL --- */}
       {historyGoal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[80vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-stone-100 dark:border-slate-800 animate-in slide-in-from-bottom-10">
                   <div className="p-6 pb-2 flex justify-between items-start shrink-0">
                       <div>
                           <h3 className="text-xl font-bold text-stone-800 dark:text-white">{historyGoal.name}</h3>
                           <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">Transaction History</p>
                       </div>
                       <button onClick={() => setHistoryGoal(null)} className="p-2 bg-stone-100 dark:bg-slate-800 rounded-full hover:bg-stone-200 dark:hover:bg-slate-700"><X size={20}/></button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-6 pt-2">
                       {loadingHistory ? (
                           <div className="text-center py-10 text-stone-400">Loading...</div>
                       ) : historyData.length > 0 ? (
                           <div className="space-y-4 relative border-l-2 border-stone-100 dark:border-slate-800 ml-3">
                               {historyData.map((tx, i) => (
                                   <div key={tx.id} className="ml-6 relative animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i*0.05}s` }}>
                                       <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${tx.type === 'expense' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                       <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-800 p-3 rounded-xl">
                                           <div>
                                               <div className="flex items-center gap-1.5 mb-0.5">
                                                   {/* 2. USE ICONS HERE */}
                                                   {tx.type === 'expense' ? (
                                                       <ArrowUpRight size={14} className="text-emerald-500" />
                                                   ) : (
                                                       <ArrowDownLeft size={14} className="text-amber-500" />
                                                   )}
                                                   <p className={`text-xs font-bold uppercase ${tx.type === 'expense' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                       {tx.type === 'expense' ? 'Added Money' : 'Withdrawn'}
                                                   </p>
                                               </div>
                                               <p className="text-[10px] text-stone-400 flex items-center gap-1">
                                                   <Calendar size={10} /> {new Date(tx.date).toLocaleDateString()}
                                               </p>
                                           </div>
                                           <span className={`font-bold ${tx.type === 'expense' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                               {tx.type === 'expense' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                           </span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="text-center py-10 text-stone-400 italic bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-slate-700">No transactions recorded yet.</div>
                       )}
                   </div>
               </div>
           </div>
       )}

       {/* --- MAIN UI --- */}
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white">Savings Goals</h2>
            <p className="text-stone-500 dark:text-slate-400">Visualize and track your financial dreams.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-stone-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg shadow-stone-200 dark:shadow-none">
             <Plus className="w-4 h-4" /> New Goal
          </button>
       </div>

       {showForm && (
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-stone-100 dark:shadow-none border border-stone-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
               {/* Form Fields */}
               <div className="flex-1 w-full">
                   <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase ml-1">Goal Name</label>
                   <input className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border border-transparent focus:border-blue-500" placeholder="e.g. New Laptop" value={newGoal.name} onChange={e=>setNewGoal({...newGoal, name: e.target.value})} />
               </div>
               <div className="flex-1 w-full">
                   <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase ml-1">Target Amount</label>
                   <input className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border border-transparent focus:border-blue-500" type="number" placeholder="50000" value={newGoal.target} onChange={e=>setNewGoal({...newGoal, target: e.target.value})} />
               </div>
               <div className="flex-1 w-full">
                   <label className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase ml-1">Deadline</label>
                   <input className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-500 dark:text-slate-400 border border-transparent focus:border-blue-500" type="date" value={newGoal.deadline} onChange={e=>setNewGoal({...newGoal, deadline: e.target.value})} />
               </div>
               <button onClick={createGoal} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold w-full md:w-auto hover:bg-blue-700 transition">Create</button>
           </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
           {goals.map((g: Goal) => {
               const progress = Math.min((g.current_amount / g.target_amount) * 100, 100);
               const suggestion = getSuggestion(g);
               const daysLeft = getDaysLeft(g.deadline);
               const isCompleted = g.current_amount >= g.target_amount;

               return (
                   <div key={g.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 dark:border-slate-800 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                       
                       <div className="flex justify-between items-start mb-6">
                           <div className={`p-3.5 rounded-2xl transition-colors ${
                               isCompleted 
                               ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                               : 'bg-stone-100 text-stone-400 dark:bg-slate-800 dark:text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 dark:group-hover:bg-amber-900/30 dark:group-hover:text-amber-400'
                           }`}>
                               <Trophy className="w-7 h-7" />
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => openHistory(g)} className="text-stone-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition" title="View History">
                                   <History size={18}/>
                               </button>
                               <button onClick={() => deleteGoal(g.id)} className="text-stone-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition"><Trash2 size={18}/></button>
                           </div>
                       </div>

                       <div className="mb-4">
                           <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-stone-800 dark:text-white line-clamp-1">{g.name}</h3>
                                {daysLeft && !isCompleted && <span className="text-xs font-bold bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 px-2 py-1 rounded-lg whitespace-nowrap">{daysLeft}</span>}
                           </div>
                           <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-extrabold text-stone-800 dark:text-white">₹{g.current_amount.toLocaleString()}</span>
                                <span className="text-stone-400 dark:text-slate-500 font-medium">/ {g.target_amount.toLocaleString()}</span>
                           </div>
                       </div>

                       <div className="w-full bg-stone-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden mb-4">
                           <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                       </div>

                       {suggestion && (
                           <div className={`flex items-center gap-2 text-xs font-bold mb-6 ${
                               isCompleted 
                               ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' 
                               : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                           } p-2.5 rounded-xl`}>
                               <TrendingUp className="w-4 h-4" /> {suggestion}
                           </div>
                       )}

                       <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setActiveAction({ id: g.id, type: 'withdraw', name: g.name })} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 transition">
                                <Minus size={16} /> Withdraw
                            </button>
                            <button onClick={() => setActiveAction({ id: g.id, type: 'add', name: g.name })} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-stone-900 dark:bg-blue-600 text-white hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg shadow-stone-200 dark:shadow-none">
                                <Plus size={16} /> Add Money
                            </button>
                       </div>
                   </div>
               )
           })}
       </div>
    </div>
  );
}