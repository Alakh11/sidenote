import { useState } from 'react';
import axios from 'axios';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { 
  Plus, Trash2, Landmark, Calculator, CalendarClock, 
  Percent, X, Edit, Eye, CheckCircle2, CircleDashed, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function LoanTracker() {
  const router = useRouter();
  const user = router.options.context?.user;
  const loans = useLoaderData({ from: '/loans' });
  const API_URL = "https://sidenote-q60v.onrender.com";

  // --- STATES ---
  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '', total_amount: '', interest_rate: '', tenure_months: '', start_date: ''
  });

  // Calculator State
  const [calcData, setCalcData] = useState({ amount: '', rate: '', months: '' });
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [calcSchedule, setCalcSchedule] = useState<any[]>([]); 
  const [showCalcList, setShowCalcList] = useState(false); 

  // --- ACTIONS ---

  // 1. Calculate EMI & Breakdown
  const handleCalculateTool = () => {
    const P = parseFloat(calcData.amount);
    const R_annual = parseFloat(calcData.rate);
    const N = parseFloat(calcData.months);

    if (!P || !R_annual || !N) return;

    const r = (R_annual / 12) / 100;
    let emi = 0;
    
    if (r === 0) {
        emi = P / N;
    } else {
        emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    }

    setCalcResult(emi);

    // Generate Amortization Schedule
    let balance = P;
    const schedule = [];
    
    for (let i = 1; i <= N; i++) {
        const interest = balance * r;
        const principal = emi - interest;
        balance = balance - principal;

        schedule.push({
            month: i,
            principal: principal,
            interest: interest,
            balance: balance > 0 ? balance : 0
        });
    }
    setCalcSchedule(schedule);
    setShowCalcList(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const payload = {
              user_email: user.email,
              name: formData.name,
              total_amount: parseFloat(formData.total_amount),
              interest_rate: parseFloat(formData.interest_rate),
              tenure_months: parseInt(formData.tenure_months),
              start_date: formData.start_date
          };

          if (editingId) {
             await axios.put(`${API_URL}/loans/${editingId}`, payload);
          } else {
             await axios.post(`${API_URL}/loans`, payload);
          }

          resetForm();
          router.invalidate();
      } catch (e) { alert("Error saving loan"); }
  };

  const deleteLoan = async (id: number) => {
      if(confirm("Delete this loan tracker?")) {
          await axios.delete(`${API_URL}/loans/${id}`);
          router.invalidate();
      }
  };

  const editLoan = (loan: any) => {
      setEditingId(loan.id);
      setFormData({
          name: loan.name,
          total_amount: loan.total_amount,
          interest_rate: loan.interest_rate,
          tenure_months: loan.tenure_months,
          start_date: loan.start_date
      });
      setShowForm(true);
      setShowCalculator(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', total_amount: '', interest_rate: '', tenure_months: '', start_date: '' });
  };

  // 3. Generate Loan Schedule (Paid vs Pending)
  const getSchedule = (loan: any) => {
      const schedule = [];
      const startDate = new Date(loan.start_date);
      const today = new Date();

      for (let i = 0; i < loan.tenure_months; i++) {
          const emiDate = new Date(startDate);
          emiDate.setMonth(startDate.getMonth() + i);
          
          const isPaid = emiDate < today;
          schedule.push({
              number: i + 1,
              date: emiDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
              amount: loan.emi_amount,
              status: isPaid ? 'Paid' : 'Pending'
          });
      }
      return schedule;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                    <Landmark className="w-8 h-8 text-blue-600" /> Loan Tracker
                </h2>
                <p className="text-stone-500 dark:text-slate-400">Monitor your EMIs and repayment progress.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowCalculator(!showCalculator)} className="bg-white dark:bg-slate-800 text-stone-800 dark:text-white border border-stone-200 dark:border-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-slate-700 transition">
                    <Calculator size={18} /> EMI Calculator
                </button>
                <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="bg-stone-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg">
                    <Plus size={18} /> New Loan
                </button>
            </div>
        </div>

        {/* --- EMI CALCULATOR TOOL --- */}
        {showCalculator && (
             <div className="bg-stone-900 dark:bg-slate-800 text-white p-6 rounded-[2rem] shadow-xl animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-400" /> Quick EMI Calculator</h3>
                    <button onClick={() => setShowCalculator(false)}><X className="w-5 h-5 text-stone-400" /></button>
                </div>
                
                {/* Inputs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mb-6">
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Amount (₹)</label>
                        <input type="number" className="w-full bg-stone-800 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold mt-1" placeholder="₹" value={calcData.amount} onChange={e => setCalcData({...calcData, amount: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Rate (% p.a)</label>
                        <input type="number" className="w-full bg-stone-800 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold mt-1" placeholder="%" value={calcData.rate} onChange={e => setCalcData({...calcData, rate: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Months</label>
                        <input type="number" className="w-full bg-stone-800 dark:bg-slate-900 p-3 rounded-xl outline-none font-bold mt-1" placeholder="#" value={calcData.months} onChange={e => setCalcData({...calcData, months: e.target.value})} />
                    </div>
                    <button onClick={handleCalculateTool} className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl font-bold transition h-[50px]">Calculate</button>
                </div>

                {/* Result & Schedule */}
                {calcResult !== null && (
                    <div className="bg-stone-800 dark:bg-slate-900 rounded-2xl overflow-hidden border border-stone-700">
                        <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-stone-700/50 transition" onClick={() => setShowCalcList(!showCalcList)}>
                             <div>
                                <p className="text-stone-400 text-xs font-bold uppercase">Estimated Monthly EMI</p>
                                <p className="text-3xl font-black text-emerald-400 mt-1">₹{Math.round(calcResult).toLocaleString()}</p>
                             </div>
                             <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                                 {showCalcList ? 'Hide Schedule' : 'Show Schedule'}
                                 {showCalcList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                             </div>
                        </div>

                        {/* Breakdown Table */}
                        {showCalcList && (
                            <div className="max-h-60 overflow-y-auto border-t border-stone-700 scrollbar-thin scrollbar-thumb-stone-600">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-stone-700/50 text-stone-400 text-xs uppercase sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="p-3">Month</th>
                                            <th className="p-3">Principal</th>
                                            <th className="p-3">Interest</th>
                                            <th className="p-3 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-700/50">
                                        {calcSchedule.map((row: any) => (
                                            <tr key={row.month} className="hover:bg-white/5">
                                                <td className="p-3 font-bold text-stone-300">{row.month}</td>
                                                <td className="p-3 text-emerald-400">₹{Math.round(row.principal).toLocaleString()}</td>
                                                <td className="p-3 text-rose-400">₹{Math.round(row.interest).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono text-stone-400">₹{Math.round(row.balance).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
             </div>
        )}

        {/* --- ADD/EDIT FORM --- */}
        {showForm && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-stone-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-stone-800 dark:text-white">{editingId ? 'Edit Loan' : 'Add New Loan'}</h3>
                    <button onClick={resetForm}><X className="w-5 h-5 text-stone-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Loan Name (e.g. Car Loan)" className="p-3 bg-stone-50 dark:bg-slate-800 dark:text-white rounded-xl font-semibold outline-none border border-transparent focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    <input type="number" placeholder="Total Amount" className="p-3 bg-stone-50 dark:bg-slate-800 dark:text-white rounded-xl font-semibold outline-none border border-transparent focus:border-blue-500" value={formData.total_amount} onChange={e => setFormData({...formData, total_amount: e.target.value})} required />
                    <input type="number" step="0.1" placeholder="Interest Rate (%)" className="p-3 bg-stone-50 dark:bg-slate-800 dark:text-white rounded-xl font-semibold outline-none border border-transparent focus:border-blue-500" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} required />
                    <input type="number" placeholder="Tenure (Months)" className="p-3 bg-stone-50 dark:bg-slate-800 dark:text-white rounded-xl font-semibold outline-none border border-transparent focus:border-blue-500" value={formData.tenure_months} onChange={e => setFormData({...formData, tenure_months: e.target.value})} required />
                    <input type="date" className="p-3 bg-stone-50 dark:bg-slate-800 dark:text-white rounded-xl font-semibold outline-none text-stone-500 border border-transparent focus:border-blue-500" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                    <button type="submit" className="md:col-span-2 bg-stone-900 dark:bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-blue-500 transition shadow-lg">{editingId ? 'Update Loan' : 'Start Tracking'}</button>
                </form>
            </div>
        )}

        {/* --- LOAN CARDS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loans.map((loan: any) => (
                <div key={loan.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                    
                    {/* Actions */}
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editLoan(loan)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 transition" title="Edit">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => deleteLoan(loan.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 transition" title="Delete">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    {/* Card Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-stone-900 dark:bg-slate-800 text-white dark:text-blue-400 rounded-2xl shadow-lg shadow-stone-200 dark:shadow-none">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-stone-800 dark:text-white">{loan.name}</h3>
                            <div className="flex gap-3 text-xs font-bold text-stone-400 dark:text-slate-500 uppercase mt-1">
                                <span className="flex items-center gap-1"><Percent size={12}/> {loan.interest_rate}% Rate</span>
                                <span className="flex items-center gap-1"><CalendarClock size={12}/> {loan.tenure_months} Mo.</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center mb-6">
                        <div>
                            <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Monthly EMI</p>
                            <p className="text-2xl font-black text-stone-800 dark:text-white">₹{Math.round(loan.emi_amount).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase">Total + Interest</p>
                             <p className="text-lg font-bold text-stone-600 dark:text-slate-300">₹{Math.round(loan.emi_amount * loan.tenure_months).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">Paid: ₹{Math.round(loan.amount_paid).toLocaleString()}</span>
                            <span className="text-rose-500 dark:text-rose-400">Left: ₹{Math.round(loan.amount_remaining).toLocaleString()}</span>
                        </div>
                        <div className="h-4 w-full bg-stone-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-stone-800 dark:bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${loan.progress}%` }}></div>
                        </div>
                        <p className="text-center text-xs font-bold text-stone-400 dark:text-slate-500">{loan.months_paid} of {loan.tenure_months} months completed</p>
                    </div>

                    {/* View Schedule Button */}
                    <button 
                        onClick={() => setSelectedLoan(loan)}
                        className="w-full py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold hover:bg-stone-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                        <Eye size={16} /> View EMI Schedule
                    </button>
                </div>
            ))}
        </div>

        {/* --- SCHEDULE MODAL --- */}
        {selectedLoan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setSelectedLoan(null)} />
                
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-md max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-slate-800">
                    
                    {/* Modal Header */}
                    <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex justify-between items-center bg-stone-50 dark:bg-slate-800">
                         <div>
                             <h3 className="font-bold text-lg text-stone-800 dark:text-white">{selectedLoan.name}</h3>
                             <p className="text-xs text-stone-400 dark:text-slate-400 uppercase font-bold">EMI Schedule</p>
                         </div>
                         <button onClick={() => setSelectedLoan(null)} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-stone-100 dark:hover:bg-slate-600 transition"><X size={18} className="text-stone-500 dark:text-white"/></button>
                    </div>

                    {/* Modal List */}
                    <div className="overflow-y-auto p-4 space-y-2">
                         {getSchedule(selectedLoan).map((emi: any) => (
                             <div key={emi.number} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${
                                 emi.status === 'Paid' 
                                 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' 
                                 : 'bg-white dark:bg-slate-900 border-stone-100 dark:border-slate-800'
                             }`}>
                                 <div className="flex items-center gap-3">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                         emi.status === 'Paid' ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-stone-100 text-stone-500 dark:bg-slate-800 dark:text-slate-500'
                                     }`}>
                                         {emi.number}
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-stone-700 dark:text-slate-200">{emi.date}</p>
                                         <p className="text-[10px] uppercase font-bold text-stone-400 dark:text-slate-500">EMI {emi.number}</p>
                                     </div>
                                 </div>
                                 
                                 <div className="text-right">
                                     <p className="font-bold text-stone-800 dark:text-white">₹{Math.round(emi.amount).toLocaleString()}</p>
                                     <span className={`text-[10px] font-bold uppercase flex items-center justify-end gap-1 ${
                                         emi.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-slate-500'
                                     }`}>
                                         {emi.status === 'Paid' ? <CheckCircle2 size={10} /> : <CircleDashed size={10} />}
                                         {emi.status}
                                     </span>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}