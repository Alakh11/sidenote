import { useState } from 'react';
import axios from 'axios';
import { X, Wallet, ReceiptIndianRupee, CheckCircle2, Target } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

export default function UserDetailView({ userId, onBack }: { userId: number, onBack: () => void }) {
    const [data, setData] = useState<any>(null);
    const [tab, setTab] = useState<'tx' | 'loan' | 'lend' | 'goal'>('tx');

    if (!data) {
        const token = localStorage.getItem('token');
        axios.get(`${API_URL}/admin/users/${userId}/full-data`, { headers: { Authorization: `Bearer ${token}` } })
             .then(res => setData(res.data))
             .catch(() => alert("Failed to fetch user data"));
        return <div className="p-10 text-center text-stone-500">Loading User Data...</div>;
    }

    const { profile, transactions, loans, lending, goals } = data;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-stone-100 dark:border-slate-800">
                <button onClick={onBack} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 dark:bg-slate-800 dark:text-white"><X size={20} /></button>
                <div>
                    <h2 className="text-2xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        {profile.name} <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md uppercase">User ID: {userId}</span>
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-slate-400">{profile.email || profile.mobile}</p>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'tx', label: `Transactions (${transactions.length})`, icon: Wallet },
                    { id: 'loan', label: `Loans (${loans.length})`, icon: ReceiptIndianRupee },
                    { id: 'lend', label: `Lending (${lending.records.length})`, icon: CheckCircle2 },
                    { id: 'goal', label: `Goals (${goals.length})`, icon: Target },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${tab === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 min-h-[400px]">
                {tab === 'tx' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-stone-400 font-bold border-b border-stone-100 dark:border-slate-800"><tr><th className="pb-3 pl-2">Date</th><th className="pb-3">Note</th><th className="pb-3 text-right pr-2">Amount</th></tr></thead>
                            <tbody>
                                {transactions.map((t: any) => (
                                    <tr key={t.id} className="border-b border-stone-50 dark:border-slate-800/50 last:border-0 hover:bg-stone-50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 pl-2 text-stone-500 dark:text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="py-3 font-medium text-stone-800 dark:text-white">{t.note} <span className="text-[10px] text-stone-400 bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-1 uppercase">{t.type}</span></td>
                                        <td className={`py-3 pr-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-800 dark:text-white'}`}>₹{t.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {tab === 'loan' && (
                    <div className="space-y-3">
                        {loans.map((l: any) => (
                            <div key={l.id} className="p-4 border border-stone-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-stone-50/50 dark:bg-slate-950/50">
                                <div><p className="font-bold text-stone-800 dark:text-white">{l.name}</p><p className="text-xs text-stone-500 dark:text-slate-500">{l.tenure_months} Months • {l.interest_rate}% Interest</p></div>
                                <div className="text-right"><p className="font-bold text-stone-800 dark:text-white">₹{l.total_amount}</p><p className="text-xs text-rose-500 font-bold">EMI: ₹{Number(l.emi_amount).toFixed(0)}</p></div>
                            </div>
                        ))}
                        {loans.length === 0 && <div className="flex flex-col items-center justify-center h-64 text-stone-400 italic"><ReceiptIndianRupee size={48} className="mb-2 opacity-20"/>No active loans found.</div>}
                    </div>
                )}
                {tab === 'lend' && (
                    <div className="space-y-3">
                        {lending.records.map((r: any) => (
                            <div key={r.id} className="p-4 border border-stone-100 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-stone-50/50 dark:bg-slate-950/50">
                                <div><p className="font-bold text-stone-800 dark:text-white">To: {r.borrower_name}</p><p className="text-xs text-stone-500 dark:text-slate-500">Reason: {r.reason}</p></div>
                                <div className="text-right"><p className="font-bold text-rose-600 dark:text-rose-400">₹{r.amount}</p><p className="text-xs text-stone-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-stone-200 dark:border-slate-700 mt-1 inline-block">{r.status}</p></div>
                            </div>
                        ))}
                        {lending.records.length === 0 && <div className="flex flex-col items-center justify-center h-64 text-stone-400 italic"><CheckCircle2 size={48} className="mb-2 opacity-20"/>No lending records found.</div>}
                    </div>
                )}
                {tab === 'goal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goals.map((g: any) => (
                            <div key={g.id} className="p-5 bg-stone-50 dark:bg-slate-950/50 border border-stone-100 dark:border-slate-800 rounded-2xl">
                                <div className="flex justify-between mb-2"><p className="font-bold text-stone-800 dark:text-white">{g.name}</p><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{(g.current_amount/g.target_amount*100).toFixed(0)}%</p></div>
                                <div className="w-full bg-stone-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{width: `${(g.current_amount/g.target_amount)*100}%`}}></div></div>
                                <p className="text-xs text-right mt-2 text-stone-500 dark:text-slate-400 font-mono">₹{g.current_amount.toLocaleString()} / ₹{g.target_amount.toLocaleString()}</p>
                            </div>
                        ))}
                         {goals.length === 0 && <div className="col-span-2 flex flex-col items-center justify-center h-64 text-stone-400 italic"><Target size={48} className="mb-2 opacity-20"/>No savings goals set.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}