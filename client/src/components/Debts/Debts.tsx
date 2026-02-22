import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { 
  Plus, Wallet, ArrowUpRight, ArrowDownLeft, AlertCircle, X, CheckCircle2, 
  Crown, AlertTriangle, Clock, Calendar, TrendingUp, Check, Trash2 
} from 'lucide-react';

interface Borrower {
    id: number;
    name: string;
    total_lent: number;
    total_repaid: number;
    current_balance: number;
    last_activity: string;
}

export default function Debts() {
  const router = useRouter();
  const user = router.options.context?.user;
  const { stats, top_borrowers, all_borrowers } = useLoaderData({ from: '/debts' });
  const API_URL = "https://sidenote-8nu4.onrender.com";

  // State
  const [showForm, setShowForm] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
      borrower_id: '',
      new_borrower_name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      due_date: '',
      reason: '',
      interest_rate: '',
      interest_period: 'Monthly'
  });

  const handleLend = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await axios.post(`${API_URL}/debts/lend`, {
              user_email: user.email,
              borrower_id: formData.borrower_id ? parseInt(formData.borrower_id) : null,
              new_borrower_name: formData.new_borrower_name,
              amount: parseFloat(formData.amount),
              date: formData.date,
              due_date: formData.due_date || null,
              reason: formData.reason,
              interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
              interest_period: formData.interest_period
          });
          setShowForm(false);
          setFormData({ borrower_id: '', new_borrower_name: '', amount: '', date: '', due_date: '', reason: '', interest_rate: '', interest_period: 'Monthly' });
          router.invalidate();
      } catch (e: any) { 
          alert("Failed: " + (e.response?.data?.detail || e.message)); 
      }
  };

  const deleteBorrower = async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!confirm("Are you sure? This will delete the person and ALL their transaction history permanently.")) return;
      try {
          await axios.delete(`${API_URL}/debts/borrowers/${id}`);
          router.invalidate();
      } catch (e) { alert("Failed to delete borrower"); }
  };

  const openLedger = (borrower: Borrower) => {
      setSelectedBorrower(borrower);
      setShowLedger(true);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
                <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                    <Wallet className="w-8 h-8 text-indigo-600" /> Debt Manager
                </h2>
                <p className="text-stone-500 dark:text-slate-400">Track lending, interest, and repayments.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="bg-stone-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 dark:hover:bg-indigo-500 transition shadow-lg">
                <Plus size={18} /> Lend Money
            </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><ArrowUpRight size={20}/></div><span className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Total Lent</span></div>
                <p className="text-3xl font-black text-stone-800 dark:text-white">₹{stats?.total_lent?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><ArrowDownLeft size={20}/></div><span className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Total Repaid</span></div>
                <p className="text-3xl font-black text-stone-800 dark:text-white">₹{stats?.total_repaid?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={100}/></div>
                <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg"><AlertCircle size={20}/></div><span className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Outstanding</span></div>
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400">₹{stats?.outstanding?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-indigo-600 dark:bg-indigo-900/40 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-3 opacity-90">
                       <Crown size={18} className="text-amber-300" />
                       <span className="text-xs font-bold uppercase tracking-wider">High Risk</span>
                   </div>
                   <div className="space-y-3">
                       {top_borrowers && top_borrowers.length > 0 ? top_borrowers.map((b: Borrower) => (
                           <div key={b.id} className="flex justify-between items-center text-sm border-b border-indigo-500/30 pb-1 last:border-0">
                               <span className="font-bold truncate w-20">{b.name}</span>
                               <span className="font-mono opacity-90">₹{b.current_balance}</span>
                           </div>
                       )) : <span className="text-xs opacity-60 italic">No pending dues</span>}
                   </div>
                </div>
            </div>
        </div>

        {/* LENDING FORM MODAL */}
        {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 border border-stone-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-stone-800 dark:text-white">Record New Loan</h3>
                        <button onClick={() => setShowForm(false)}><X className="text-stone-400 dark:text-slate-500"/></button>
                    </div>
                    
                    <form onSubmit={handleLend} className="space-y-4">
                        <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-xl space-y-3 border border-stone-100 dark:border-slate-700">
                            <label className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Borrower</label>
                            <select 
                                className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 text-stone-800 dark:text-white border border-stone-200 dark:border-slate-700 outline-none"
                                value={formData.borrower_id}
                                onChange={e => setFormData({...formData, borrower_id: e.target.value, new_borrower_name: ''})}
                            >
                                <option value="">-- Select Existing --</option>
                                {all_borrowers?.map((b: Borrower) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            {!formData.borrower_id && (
                                <input placeholder="Or New Name..." className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 text-stone-800 dark:text-white border border-stone-200 dark:border-slate-700 outline-none" value={formData.new_borrower_name} onChange={e => setFormData({...formData, new_borrower_name: e.target.value})} />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Amount</label>
                                <input type="number" required className="w-full p-3 mt-1 rounded-xl bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-white font-bold outline-none" placeholder="₹" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Lend Date</label>
                                <input type="date" required className="w-full p-3 mt-1 rounded-xl bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-white font-bold outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                             <div className="col-span-2 flex items-center gap-2 mb-1">
                                 <TrendingUp size={14} className="text-indigo-600 dark:text-indigo-400" />
                                 <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Interest (Optional)</span>
                             </div>
                             <div>
                                 <input type="number" step="0.1" placeholder="Rate %" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-stone-800 dark:text-white font-bold outline-none" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} />
                             </div>
                             <div>
                                 <select className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-stone-800 dark:text-white font-bold outline-none" value={formData.interest_period} onChange={e => setFormData({...formData, interest_period: e.target.value})}>
                                     <option>Monthly</option><option>Yearly</option><option>Daily</option>
                                 </select>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Due Date</label>
                                <input type="date" className="w-full p-3 mt-1 rounded-xl bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-white font-bold outline-none" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Note</label>
                                <input required className="w-full p-3 mt-1 rounded-xl bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-white font-bold outline-none" placeholder="Reason..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                             </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg mt-4">Confirm Loan</button>
                    </form>
                </div>
            </div>
        )}

        {/* BORROWER LIST */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {all_borrowers?.map((b: Borrower) => (
                <div key={b.id} onClick={() => openLedger(b)} className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-50 dark:border-slate-800 shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden">
                     
                     <button 
                         onClick={(e) => deleteBorrower(e, b.id)} 
                         className="absolute top-4 right-4 p-2 bg-stone-100 dark:bg-slate-800 text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Delete Borrower"
                     >
                         <Trash2 size={16} />
                     </button>

                     <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-stone-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-stone-500 dark:text-slate-400 font-bold text-lg border border-stone-200 dark:border-slate-700 relative">
                                {b.current_balance <= 0 ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : b.name.charAt(0)}
                                {b.current_balance > 10000 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" title="High Outstanding" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-stone-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{b.name}</h3>
                                <p className="text-xs text-stone-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                                    <Clock size={12} /> 
                                    {new Date(b.last_activity).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                     </div>
                     
                     <div className="space-y-3">
                         <div className="flex justify-between text-sm">
                             <span className="text-stone-500 dark:text-slate-400 font-medium">Total Lent</span>
                             <span className="font-bold text-stone-800 dark:text-white">₹{b.total_lent.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                             <span className="text-stone-500 dark:text-slate-400 font-medium">Repaid</span>
                             <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{b.total_repaid.toLocaleString()}</span>
                         </div>
                         <div className="h-px bg-stone-100 dark:bg-slate-800 my-2"></div>
                         <div className="flex justify-between items-end">
                             <span className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Outstanding</span>
                             <span className={`text-2xl font-black ${b.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                 ₹{b.current_balance.toLocaleString()}
                             </span>
                         </div>
                     </div>
                     <div className="mt-4 h-2 w-full bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(b.total_repaid / (b.total_lent || 1)) * 100}%` }} />
                     </div>
                </div>
            ))}
        </div>

        {/* LEDGER MODAL */}
        {showLedger && selectedBorrower && (
             <BorrowerLedger 
                borrower={selectedBorrower} 
                onClose={() => { setShowLedger(false); setSelectedBorrower(null); router.invalidate(); }} 
             />
        )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: BORROWER LEDGER
// ----------------------------------------------------------------------
function BorrowerLedger({ borrower, onClose }: { borrower: Borrower, onClose: () => void }) {
    const [data, setData] = useState<{debts: any[], repayments: any[], total_interest: number, risks: string[]} | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRepayForm, setShowRepayForm] = useState(false);
    const [repayData, setRepayData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'UPI', debt_id: '' });

    const fetchData = () => {
        axios.get(`https://sidenote-8nu4.onrender.com/debts/ledger/${borrower.id}`)
             .then(res => { setData(res.data); setLoading(false); })
             .catch(e => { console.error(e); alert("Failed to load ledger."); });
    };

    useEffect(() => {
        fetchData();
    }, [borrower.id]);

    const handleRepay = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`https://sidenote-8nu4.onrender.com/debts/repay`, {
                debt_id: parseInt(repayData.debt_id),
                amount: parseFloat(repayData.amount),
                date: repayData.date,
                mode: repayData.mode
            });
            setShowRepayForm(false);
            onClose(); 
        } catch(e) { alert("Repayment failed"); }
    };

    const markPaid = async (debtId: number) => {
        if(!confirm("Mark this loan as fully paid?")) return;
        try {
            await axios.post(`https://sidenote-8nu4.onrender.com/debts/mark-paid`, { debt_id: debtId, date: new Date().toISOString().split('T')[0] });
            onClose();
        } catch(e) { alert("Action failed"); }
    };

    const deleteTransaction = async (debtId: number) => {
        if (!confirm("Delete this loan entry? This will adjust the balance automatically.")) return;
        try {
            await axios.delete(`https://sidenote-8nu4.onrender.com/debts/${debtId}`);
            fetchData();
        } catch (e) { alert("Delete failed"); }
    };

    if(loading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
             <div className="absolute inset-0 bg-stone-900/60 dark:bg-black/90 backdrop-blur-sm" onClick={onClose} />
             <div className="relative bg-white dark:bg-slate-900 w-full md:max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-stone-200 dark:border-slate-800">
                 
                 {/* Header */}
                 <div className="p-6 md:p-8 bg-stone-50 dark:bg-slate-800 border-b border-stone-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                     <div>
                         <h3 className="text-2xl font-bold text-stone-800 dark:text-white">{borrower.name}</h3>
                         <div className="flex flex-wrap gap-2 mt-2">
                             {data?.risks?.map(risk => (
                                 <span key={risk} className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                                     <AlertTriangle size={10} /> {risk}
                                 </span>
                             ))}
                             {data?.total_interest! > 0 && (
                                 <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                                     <TrendingUp size={10} /> +₹{data?.total_interest} Interest
                                 </span>
                             )}
                         </div>
                     </div>
                     <div className="text-right">
                         <p className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500">Outstanding</p>
                         <p className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{borrower.current_balance.toLocaleString()}</p>
                     </div>
                 </div>

                 {/* Scrollable List */}
                 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                     
                     {/* 1. Active Loans */}
                     <div>
                         <h4 className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500 mb-4 tracking-wider">Active Loans</h4>
                         <div className="space-y-3">
                             {data?.debts.filter(d => d.status !== 'Paid').map((debt: any) => (
                                 <div key={debt.id} className="bg-white dark:bg-slate-950 border border-stone-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                     <div className="flex justify-between items-start">
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <p className="font-bold text-stone-800 dark:text-white">{debt.reason}</p>
                                                 {debt.is_overdue && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Overdue</span>}
                                             </div>
                                             <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                 <Calendar size={12} />
                                                 {new Date(debt.date).toLocaleDateString()}
                                                 {debt.interest_rate > 0 && <span className="text-indigo-500 font-bold ml-1">• {debt.interest_rate}% {debt.interest_period}</span>}
                                             </p>
                                         </div>
                                         <div className="text-right">
                                             <p className="font-bold text-stone-800 dark:text-white">₹{debt.total_due?.toFixed(0) || debt.amount}</p>
                                             {debt.accrued_interest > 0 && <p className="text-[10px] text-indigo-500 font-bold">(+₹{debt.accrued_interest} Int)</p>}
                                         </div>
                                     </div>
                                     <div className="mt-3 pt-3 border-t border-stone-50 dark:border-slate-800 flex justify-end gap-2">
                                         <button onClick={() => deleteTransaction(debt.id)} className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-500 hover:text-rose-500 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors">
                                             <Trash2 size={12} /> Delete
                                         </button>
                                         <button onClick={() => markPaid(debt.id)} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                                             <Check size={12} /> Mark Paid
                                         </button>
                                     </div>
                                 </div>
                             ))}
                             {data?.debts.filter(d => d.status !== 'Paid').length === 0 && <p className="text-sm text-stone-400 italic">No active loans.</p>}
                         </div>
                     </div>

                     {/* 2. Timeline */}
                     <div>
                         <h4 className="text-xs font-bold uppercase text-stone-400 dark:text-slate-500 mb-4 tracking-wider mt-6">Timeline</h4>
                         <div className="relative border-l-2 border-stone-100 dark:border-slate-800 ml-3 space-y-6 pb-4">
                             {[...data?.debts || [], ...data?.repayments || []]
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((item: any, idx: number) => {
                                    const isRepayment = item.mode !== undefined; 
                                    return (
                                        <div key={`${isRepayment ? 'r':'d'}-${item.id}`} className="ml-6 relative animate-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${idx * 0.05}s` }}>
                                            <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${isRepayment ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className={`text-sm font-bold ${isRepayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-800 dark:text-white'}`}>
                                                        {isRepayment ? `Repayment (${item.mode})` : `Lent: ${item.reason}`}
                                                    </p>
                                                    <p className="text-xs text-stone-400 dark:text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`font-bold ${isRepayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {isRepayment ? '+' : '-'} ₹{item.amount}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                             }
                         </div>
                     </div>
                 </div>

                 {/* Footer: Add Repayment */}
                 <div className="p-4 bg-white dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 shrink-0">
                     {showRepayForm ? (
                         <form onSubmit={handleRepay} className="bg-stone-50 dark:bg-slate-800 p-4 rounded-2xl animate-in slide-in-from-bottom-4 border border-stone-100 dark:border-slate-700">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-stone-800 dark:text-white">Record Repayment</h4>
                                <button type="button" onClick={() => setShowRepayForm(false)}><X size={16} className="text-stone-500 dark:text-white" /></button>
                             </div>
                             <div className="grid grid-cols-2 gap-3 mb-3">
                                <select required className="col-span-2 p-3 rounded-xl bg-white dark:bg-slate-900 text-stone-800 dark:text-white border-none outline-none text-sm" value={repayData.debt_id} onChange={e => setRepayData({...repayData, debt_id: e.target.value})}>
                                    <option value="">Select Loan to Repay</option>
                                    {data?.debts.filter(d => d.status !== 'Paid').map(d => (
                                        <option key={d.id} value={d.id}>{d.reason} (Bal: ₹{d.total_due?.toFixed(0) || d.amount})</option>
                                    ))}
                                </select>
                                <input type="number" placeholder="Amount" className="p-3 rounded-xl bg-white dark:bg-slate-900 text-stone-800 dark:text-white outline-none text-sm" value={repayData.amount} onChange={e => setRepayData({...repayData, amount: e.target.value})} />
                                <select className="p-3 rounded-xl bg-white dark:bg-slate-900 text-stone-800 dark:text-white outline-none text-sm" value={repayData.mode} onChange={e => setRepayData({...repayData, mode: e.target.value})}>
                                    <option>UPI</option><option>Cash</option><option>Bank</option>
                                </select>
                             </div>
                             <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500">Save Repayment</button>
                         </form>
                     ) : (
                        <button onClick={() => setShowRepayForm(true)} className="w-full py-4 bg-stone-900 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-indigo-500 transition shadow-lg flex justify-center items-center gap-2">
                            <Plus size={18} /> Add Repayment
                        </button>
                     )}
                 </div>
             </div>
        </div>
    );
}