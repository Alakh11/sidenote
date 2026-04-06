import { useLoaderData, useRouter } from '@tanstack/react-router';
import { Users, Shield, CheckCircle2, XCircle, Search, Trash2, Edit, Eye, Plus, Wallet, Activity, HelpCircle, Crown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

import UserFormModal from './components/UserFormModal';
import AdminFeedbackView from './components/AdminFeedbackView';
import SystemMetricsView from './components/SystemMetricsView';
import UserDetailView from './components/UserDetailView';
import BroadcastModal from './components/BroadcastModal';

const API_URL = "https://api.sidenote.in";

export default function AdminPanel() {
  const router = useRouter();
  const { users: initialUsers, stats: initialStats } = useLoaderData({ from: '/_auth/admin' });
  const { user: currentUser } = router.options.context as any;
  const SUPERADMIN_EMAIL = "alakhchaturvedi2002@gmail.com";
  const isSuperAdmin = currentUser?.email === SUPERADMIN_EMAIL || currentUser?.role === 'superadmin';
  const canBroadcast = isSuperAdmin || currentUser?.role === 'admin';
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [serverUsers, setServerUsers] = useState<any[]>(initialUsers || []);
  const [serverStats, setServerStats] = useState<any>(initialStats || { total_users: 0, total_transactions: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC'|'DESC'>('DESC');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [search, setSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'users' | 'metrics' | 'feedback'>('users');
  
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', password: '', role: 'user' });

  const formatLocalTime = (dateString: string) => {
      if (!dateString) return null;
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
      return new Date(utcString);
  };

  useEffect(() => {
      const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
      return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
      try {
          const res = await axios.get(`${API_URL}/admin/users`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              params: { page, limit, search: debouncedSearch, start_date: startDate, end_date: endDate, sort_by: sortBy, sort_order: sortOrder }
          });
          setServerUsers(res.data.data);
          setTotalPages(res.data.total_pages);
          setServerStats(res.data.stats);
          setSelectedUserIds([]);
      } catch (error) { console.error("Failed to fetch users"); }
  };

  useEffect(() => {
      if (adminTab === 'users') fetchUsers();
  }, [page, limit, debouncedSearch, startDate, endDate, sortBy, sortOrder, adminTab]);

  const handleSort = (column: string) => {
      if (sortBy === column) setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
      else { setSortBy(column); setSortOrder('ASC'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
      if (sortBy !== col) return null;
      return sortOrder === 'ASC' ? <ArrowUp size={12} className="inline ml-1"/> : <ArrowDown size={12} className="inline ml-1"/>;
  };

  const handleDelete = async (id: number) => {
      if(!confirm("DELETE USER? This will erase ALL their data PERMANENTLY.")) return;
      try {
          await axios.delete(`${API_URL}/admin/users/${id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          fetchUsers();
      } catch(e: any) { alert(e.response?.data?.detail || "Delete failed"); }
  };

  const handleSaveUser = async () => {
      try {
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };

          if (isCreating) {
              const isEmail = !!formData.email;
              const creationPayload = {
                  name: formData.name,
                  contact: isEmail ? formData.email : formData.mobile,
                  contact_type: isEmail ? 'email' : 'mobile',
                  password: formData.password,
                  role: formData.role
              };
              await axios.post(`${API_URL}/admin/users`, creationPayload, config);
          } else if (editingUser) {
              const updatePayload = {
                  name: formData.name,
                  email: formData.email || null,
                  mobile: formData.mobile || null,
                  new_password: formData.password || undefined,
                  role: formData.role
              };
              await axios.put(`${API_URL}/admin/users/${editingUser.id}`, updatePayload, config);
          }
          
          setIsCreating(false);
          setEditingUser(null);
          setFormData({ name: '', email: '', mobile: '', password: '', role: 'user' });
          fetchUsers();
          alert("Success!");
      } catch(e: any) { alert(e.response?.data?.detail || "Operation failed"); }
  };

  if (viewUser) return <UserDetailView userId={viewUser.id} onBack={() => setViewUser(null)} />;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-600" /> Admin Control
            </h2>
            <p className="text-stone-500 dark:text-slate-400">System Overview & User Management</p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm min-w-[140px]">
                <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-stone-400" /><p className="text-xs font-bold uppercase text-stone-400">Total Users</p></div>
                <p className="text-2xl font-black text-stone-800 dark:text-white">{serverStats.total_users}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-stone-100 dark:border-slate-800 shadow-sm min-w-[140px]">
                 <div className="flex items-center gap-2 mb-1"><Wallet size={14} className="text-stone-400" /><p className="text-xs font-bold uppercase text-stone-400">Total Tx</p></div>
                <p className="text-2xl font-black text-indigo-600">{serverStats.total_transactions}</p>
            </div>
            
            {canBroadcast && (
                <button 
                    onClick={() => setIsBroadcasting(true)}
                    className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded-2xl font-bold flex flex-col justify-center items-center gap-1 hover:bg-emerald-200 transition dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                    <Megaphone size={24} />
                    <span className="text-[10px] uppercase tracking-wider">Broadcast</span>
                </button>
            )}

            <button 
                onClick={() => { setIsCreating(true); setFormData({name:'', email: '', mobile: '', password:'', role: 'user'}); }}
                className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-bold flex flex-col justify-center items-center gap-1 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none"
            >
                <Plus size={24} />
                <span className="text-[10px] uppercase tracking-wider">New User</span>
            </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-stone-200 dark:border-slate-800 pb-px overflow-x-auto scrollbar-hide">
          <button onClick={() => setAdminTab('users')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${adminTab === 'users' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white'}`}><Users size={16} /> User Management</button>
          <button onClick={() => setAdminTab('metrics')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${adminTab === 'metrics' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white'}`}><Activity size={16} /> System Performance</button>
          <button onClick={() => setAdminTab('feedback')} className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${adminTab === 'feedback' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white'}`}><HelpCircle size={16} /> Support Tickets</button>
      </div>

      {adminTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-stone-50/50 dark:bg-slate-800/50">
                  <div className="relative w-full md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input placeholder="Search users..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto text-sm">
                      <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      <span className="text-stone-400 font-bold">to</span>
                      <input type="date" className="p-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                      {(search || startDate || endDate) && <button onClick={() => {setSearch(''); setStartDate(''); setEndDate('');}} className="text-rose-500 hover:underline text-xs font-bold px-2">Clear</button>}
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                          <tr>
                                <th className="p-5 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUserIds(serverUsers.map(u => u.id));
                                            } else {
                                                setSelectedUserIds([]);
                                            }
                                        }}
                                        checked={serverUsers.length > 0 && selectedUserIds.length === serverUsers.length}
                                    />
                                </th>
                                <th className="p-5 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('name')}>User <SortIcon col="name"/></th>
                                <th className="p-5 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('email')}>Email <SortIcon col="email"/></th>
                                <th className="p-5 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('mobile')}>Mobile <SortIcon col="mobile"/></th>
                                <th className="p-5 cursor-pointer hover:text-indigo-500" onClick={() => handleSort('created_at')}>Joined <SortIcon col="created_at"/></th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-center">Actions</th>
                            </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                          {serverUsers.map((user: any) => {
                              const isUrl = user.profile_pic && user.profile_pic.startsWith('http');
                              const isEmoji = user.profile_pic && !isUrl;
                              
                              return (
                              <tr key={user.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                                  <td className="p-5 text-center">
                                      <input 
                                          type="checkbox" 
                                          className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                          checked={selectedUserIds.includes(user.id)}
                                          onChange={(e) => {
                                              if (e.target.checked) {
                                                  setSelectedUserIds(prev => [...prev, user.id]);
                                              } else {
                                                  setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                              }
                                          }}
                                      />
                                  </td>
                                  <td className="p-5 flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 overflow-hidden text-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
                                          {isUrl ? <img src={user.profile_pic} className="w-full h-full object-cover" /> : isEmoji ? <span>{user.profile_pic}</span> : user.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-stone-800 dark:text-white">{user.name}</p>
                                            {user.role === 'superadmin' && <span className="bg-purple-100 text-purple-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 dark:bg-purple-900/30 dark:text-purple-400"><Crown size={10}/> Super</span>}
                                            {user.role === 'admin' && <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 dark:bg-indigo-900/30 dark:text-indigo-400"><Shield size={10}/> Admin</span>}
                                          </div>
                                          <p className="text-xs text-stone-400">ID: {user.id}</p>
                                      </div>
                                  </td>
                                  <td className="p-5">
                                      <p className="text-sm text-stone-600 dark:text-slate-300 font-medium">{user.email || <span className="text-stone-400 italic">Unlinked</span>}</p>
                                    </td>
                                    <td className="p-5">
                                        <p className="text-sm text-stone-600 dark:text-slate-300 font-medium">{user.mobile || <span className="text-stone-400 italic">Unlinked</span>}</p>
                                    </td>
                                    <td className="p-5 text-sm font-medium text-stone-500 dark:text-slate-400">
                                        {user.created_at ? (
                                            <div className="flex flex-col">
                                                <span>{formatLocalTime(user.created_at)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                <span className="text-[10px] font-mono text-stone-400 dark:text-slate-500 mt-0.5">
                                                    {formatLocalTime(user.created_at)?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="italic text-stone-400">Unknown</span>
                                        )}
                                    </td>

                                  <td className="p-5">
                                        {user.is_verified ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-900/20 dark:text-emerald-400"><CheckCircle2 size={10} /> Verified</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-900/20 dark:text-rose-400"><XCircle size={10} /> Unverified</span>}
                                  </td>
                                    
                                  <td className="p-5 flex justify-center gap-2">
                                      <button onClick={() => setViewUser(user)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400" title="View Full Data"><Eye size={16} /></button>
                                      {(isSuperAdmin || user.role === 'user') && (
                                          <>
                                            <button onClick={() => { setEditingUser(user); setFormData({name: user.name, email: user.email || '', mobile: user.mobile || '', password: '', role: user.role || 'user'}); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400" title="Edit Profile"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(user.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400" title="Delete User"><Trash2 size={16} /></button>
                                          </>
                                      )}
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              </div>
              
              <div className="p-4 border-t border-stone-100 dark:border-slate-800 flex justify-between items-center bg-stone-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-sm text-stone-500 font-bold">
                      <select value={limit} onChange={e => {setLimit(Number(e.target.value)); setPage(1);}} className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg p-1 outline-none">
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                      </select>
                      <span>per page</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <span className="text-sm text-stone-500 font-bold">Page {page} of {totalPages || 1}</span>
                      <div className="flex gap-2">
                          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50"><ChevronLeft size={16} className="text-stone-600 dark:text-stone-400"/></button>
                          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg disabled:opacity-50"><ChevronRight size={16} className="text-stone-600 dark:text-stone-400"/></button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {adminTab === 'metrics' && <SystemMetricsView />}
      {adminTab === 'feedback' && <AdminFeedbackView />}

      {(isCreating || editingUser) && (
        <UserFormModal 
            isCreating={isCreating}
            editingUser={editingUser}
            formData={formData}
            setFormData={setFormData}
            onClose={() => { setIsCreating(false); setEditingUser(null); }}
            onSave={handleSaveUser}
            isSuperAdmin={isSuperAdmin}
        />
      )}

      {isBroadcasting && (
          <BroadcastModal 
              onClose={() => setIsBroadcasting(false)} 
              selectedUserIds={selectedUserIds} 
          />
      )}
    </div>
  );
}