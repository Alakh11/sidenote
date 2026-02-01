import { useLoaderData, useRouter } from '@tanstack/react-router';
import { 
  Users, Shield, CheckCircle2, XCircle, Search, Trash2, Edit, Eye, 
  Plus, Save, X, Key, Wallet, Target, ReceiptIndianRupee 
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const API_URL = "https://sidenote-7o2d.onrender.com";

export default function AdminPanel() {
  const router = useRouter();
  const { users, stats } = useLoaderData({ from: '/admin' });
  const [search, setSearch] = useState('');
  
  // States for Modals/Views
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form States
  const [formData, setFormData] = useState({ name: '', contact: '', password: '' });

  // ACTIONS
  const handleDelete = async (id: number) => {
      if(!confirm("DELETE USER? This will erase ALL their data (Loans, Transactions, etc) PERMANENTLY.")) return;
      try {
          await axios.delete(`${API_URL}/admin/users/${id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          router.invalidate();
      } catch(e) { alert("Delete failed"); }
  };

  const handleSaveUser = async () => {
      try {
          const payload = {
              name: formData.name,
              contact: formData.contact,
              contact_type: formData.contact.includes('@') ? 'email' : 'mobile',
              password: formData.password || undefined,
              new_password: formData.password
          };
          
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };

          if (isCreating) {
              await axios.post(`${API_URL}/admin/users`, payload, config);
          } else if (editingUser) {
              await axios.put(`${API_URL}/admin/users/${editingUser.id}`, payload, config);
          }
          
          setIsCreating(false);
          setEditingUser(null);
          setFormData({ name: '', contact: '', password: '' });
          router.invalidate();
          alert("Success!");
      } catch(e) { alert("Operation failed"); }
  };

  const filteredUsers = users.filter((u: any) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
    (u.mobile && u.mobile.includes(search))
  );

  if (viewUser) {
      return <UserDetailView userId={viewUser.id} onBack={() => setViewUser(null)} />;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-600" /> Admin Control
            </h2>
            <p className="text-stone-500 dark:text-slate-400">System Overview & User Management</p>
        </div>
        
        {/* Stats Row */}
        <div className="flex gap-4">
            <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-stone-400" />
                    <p className="text-xs font-bold uppercase text-stone-400">Total Users</p>
                </div>
                <p className="text-2xl font-black text-stone-800 dark:text-white">{stats.total_users}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm min-w-[140px]">
                 <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} className="text-stone-400" />
                    <p className="text-xs font-bold uppercase text-stone-400">Total Tx</p>
                </div>
                <p className="text-2xl font-black text-indigo-600">{stats.total_transactions}</p>
            </div>
            <button 
                onClick={() => { setIsCreating(true); setFormData({name:'', contact:'', password:''}); }}
                className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-bold flex flex-col justify-center items-center gap-1 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none"
            >
                <Plus size={24} />
                <span className="text-[10px] uppercase tracking-wider">New User</span>
            </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex justify-between items-center bg-stone-50/50 dark:bg-slate-800/50">
              <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input placeholder="Search users..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                      <tr><th className="p-5">User</th><th className="p-5">Contact / Status</th><th className="p-5 text-center">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {filteredUsers.map((user: any) => {
                          const isUrl = user.profile_pic && user.profile_pic.startsWith('http');
                          const isEmoji = user.profile_pic && !isUrl;
                          
                          return (
                          <tr key={user.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                              <td className="p-5 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 overflow-hidden text-lg border border-indigo-200 dark:border-indigo-800">
                                      {isUrl ? (
                                          <img src={user.profile_pic} className="w-full h-full object-cover" alt={user.name} />
                                      ) : isEmoji ? (
                                          <span>{user.profile_pic}</span>
                                      ) : (
                                          user.name.charAt(0).toUpperCase()
                                      )}
                                  </div>
                                  <div><p className="font-bold text-stone-800 dark:text-white">{user.name}</p><p className="text-xs text-stone-400">ID: {user.id}</p></div>
                              </td>
                              <td className="p-5">
                                  <p className="text-sm text-stone-600 dark:text-slate-300 font-medium">{user.email || user.mobile}</p>
                                  <div className="mt-1">
                                    {user.is_verified ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-900/20 dark:text-emerald-400">
                                            <CheckCircle2 size={10} /> Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-900/20 dark:text-rose-400">
                                            <XCircle size={10} /> Unverified
                                        </span>
                                    )}
                                  </div>
                              </td>
                              <td className="p-5 flex justify-center gap-2">
                                  <button onClick={() => setViewUser(user)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400" title="View Full Data"><Eye size={16} /></button>
                                  <button onClick={() => { setEditingUser(user); setFormData({name: user.name, contact: user.email || user.mobile, password: ''}); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400" title="Edit Profile"><Edit size={16} /></button>
                                  <button onClick={() => handleDelete(user.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400" title="Delete User"><Trash2 size={16} /></button>
                              </td>
                          </tr>
                      )})}
                  </tbody>
              </table>
          </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isCreating || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-stone-100 dark:border-slate-800">
                  <h3 className="text-xl font-bold mb-6 text-stone-800 dark:text-white flex items-center gap-2">
                      {isCreating ? <Plus size={20} className="text-indigo-600"/> : <Edit size={20} className="text-amber-500"/>}
                      {isCreating ? 'Create New User' : 'Edit User Profile'}
                  </h3>
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-stone-400 ml-1">Full Name</label>
                          <input className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-stone-400 ml-1">Contact (Email/Mobile)</label>
                          <input className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                      </div>
                      <div className="space-y-1 relative">
                          <label className="text-xs font-bold uppercase text-stone-400 ml-1">{isCreating ? "Password" : "New Password (Optional)"}</label>
                          <input className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                          <Key className="absolute right-3 top-8 text-stone-400" size={16} />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => { setIsCreating(false); setEditingUser(null); }} className="flex-1 py-3 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                      <button onClick={handleSaveUser} className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
                          <Save size={18} /> Save
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// ... (UserDetailView Component remains same)
function UserDetailView({ userId, onBack }: { userId: number, onBack: () => void }) {
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
            {/* Header */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-stone-100 dark:border-slate-800">
                <button onClick={onBack} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 dark:bg-slate-800 dark:text-white"><X size={20} /></button>
                <div>
                    <h2 className="text-2xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        {profile.name} <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md uppercase">User ID: {userId}</span>
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-slate-400">{profile.email || profile.mobile}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'tx', label: `Transactions (${transactions.length})`, icon: Wallet },
                    { id: 'loan', label: `Loans (${loans.length})`, icon: ReceiptIndianRupee },
                    { id: 'lend', label: `Lending (${lending.records.length})`, icon: CheckCircle2 },
                    { id: 'goal', label: `Goals (${goals.length})`, icon: Target },
                ].map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setTab(t.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${tab === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700'}`}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
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
                                <div className="flex justify-between mb-2">
                                    <p className="font-bold text-stone-800 dark:text-white">{g.name}</p>
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{(g.current_amount/g.target_amount*100).toFixed(0)}%</p>
                                </div>
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