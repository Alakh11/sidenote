import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, X, Settings, Edit2, LogOut, MessageCircle } from 'lucide-react';
import GroupHeader from '../Groups/components/GroupHeader';
import GroupTabs from '../Groups/components/GroupsTab';
import GroupFeed from '../Groups/components/GroupFeed';
import GroupSummary from '../Groups/components/GroupSummary';
import GroupBalances from '../Groups/components/GroupBalances';
import GroupMembers from '../Groups/components/GroupMembers';
import { FeedSkeleton, BalancesSkeleton } from '../Groups/components/GroupSkeletons';
import { usePreferences } from '../../context/PreferencesContext';

const API_URL = "https://api.sidenote.in";

export default function GroupDashboard() {
  const router = useRouter();
  const user = router.options.context?.user!;
  const queryClient = useQueryClient();
  const { currency } = usePreferences();

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'balances' | 'summary' | 'members'>('feed');
  const [page, setPage] = useState(1);
  
  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [splitType, setSplitType] = useState('equal');
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch All Groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users/${user.id}/groups`);
      if (res.data.length > 0 && !selectedGroupId) setSelectedGroupId(res.data[0].id);
      return res.data;
    }
  });

  const selectedGroup = groups?.find((g: any) => g.id === selectedGroupId);

  const { data: globalCategories } = useQuery({
    queryKey: ['categories', user.id],
    queryFn: async () => (await axios.get(`${API_URL}/categories/${user.id}`)).data
  });

  // 3. Tab Data
  const limit = 15;
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['group-transactions', selectedGroupId, page],
    queryFn: async () => (await axios.get(`${API_URL}/groups/${selectedGroupId}/transactions?page=${page}&limit=${limit}`)).data,
    enabled: !!selectedGroupId && (activeTab === 'feed' || activeTab === 'summary'),
  });

  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['group-settlements', selectedGroupId],
    queryFn: async () => (await axios.get(`${API_URL}/groups/${selectedGroupId}/settlements`)).data,
    enabled: !!selectedGroupId && (activeTab === 'balances' || activeTab === 'feed'),
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroupId],
    queryFn: async () => (await axios.get(`${API_URL}/groups/${selectedGroupId}/members`)).data,
    enabled: !!selectedGroupId, 
  });

  // Action Handlers
  const handleDeleteTransaction = async (txId: number) => {
    if (!window.confirm("Are you sure you want to delete this transaction? It will recalculate settlements.")) return;
    try {
      await axios.delete(`${API_URL}/groups/transactions/${txId}?user_id=${user.id}`);
      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
    } catch (err) {
      alert("Failed to delete transaction. You can only delete transactions you logged.");
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return alert("Please fill all required fields.");
    
    let parsedSplitDetails: Record<string, GLfloat> = {};
    if (selectedGroup?.type === 'split' && splitType !== 'equal') {
      let totalSplit = 0;
      Object.keys(splitDetails).forEach(memberId => {
        const val = parseFloat(splitDetails[memberId]) || 0;
        parsedSplitDetails[memberId] = val;
        totalSplit += val;
      });

      if (splitType === 'percentage' && Math.abs(totalSplit - 100) > 0.01) {
        return alert(`Percentages must add up to 100%. Currently at ${totalSplit}%.`);
      }
      if (splitType === 'exact' && Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        return alert(`Exact amounts must add up to ${currency}${amount}. Currently at ${currency}${totalSplit}.`);
      }
      if (splitType === 'ratio' && totalSplit <= 0) {
        return alert("Total ratio shares must be greater than 0.");
      }
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/transactions`, {
        amount: parseFloat(amount),
        description,
        user_id: user.id,
        category,
        payment_mode: paymentMode,
        split_type: splitType,
        split_details: splitType === 'equal' ? null : parsedSplitDetails
      });
      
      setAmount('');
      setDescription('');
      setCategory('');
      setSplitType('equal');
      setSplitDetails({});
      setIsLogModalOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
    } catch (err) {
      alert("Failed to log transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Are you sure you want to leave ${selectedGroup.name}?`)) return;
    try {
      await axios.delete(`${API_URL}/groups/${selectedGroupId}?user_id=${user.id}`);
      setIsSettingsOpen(false);
      setSelectedGroupId(null);
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to leave group.");
    }
  };

  const handleRenameGroup = async () => {
    const newName = prompt("Enter new group name:", selectedGroup.name);
    if (!newName || newName === selectedGroup.name) return;
    try {
      await axios.put(`${API_URL}/groups/${selectedGroupId}`, { name: newName });
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err) {
      alert("Failed to update group name.");
    }
  };

  const handleRefreshCode = async () => {
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/refresh-code?user_id=${user.id}`);
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err) {
      alert("Failed to generate a new code.");
    }
  };

  if (groupsLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading groups...</div>;

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2rem] border border-stone-50 dark:border-white/5 text-center shadow-sm">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Groups Yet</h3>
      </div>
    );
  }

  const groupAlias = selectedGroup ? selectedGroup.name.split(' ')[0].toLowerCase() : '';
  const displayAmount = amount || '100';
  const displayDesc = description || 'coffee';
  const waCommand = `@${groupAlias} ${displayAmount} ${displayDesc}`;
  const waLink = `https://wa.me/918796022992?text=${encodeURIComponent(waCommand)}`;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Sidebar */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2">Shared Ledgers</h3>
        <div className="flex flex-col gap-3">
          {groups.map((g: any) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setActiveTab('feed'); setPage(1); }}
              className={`p-5 rounded-2xl border text-left transition-all ${
                selectedGroupId === g.id 
                ? 'bg-blue-50 border-blue-200 dark:bg-white/10 dark:border-white/20 shadow-sm' 
                : 'bg-white border-stone-100 hover:border-stone-200 dark:bg-[#1a1a1a] dark:border-white/5 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-white">{g.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {selectedGroup && (
        <div className="w-full lg:w-2/3 bg-slate-50 dark:bg-[#121212] rounded-[2rem] border border-stone-100 dark:border-white/5 p-6 md:p-8 flex flex-col min-h-[600px] relative shadow-sm">
          
          {/* Header Container with protected right padding for the settings button */}
          <div className="relative w-full">
            <div className="absolute top-0 right-0 z-10">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/10 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all hover:scale-105"
              >
                <Settings size={18} />
              </button>
            </div>
            
            <div className="pr-14">
              <GroupHeader group={selectedGroup} settlements={settlements} totalSpend={settlements?.total_spend || 0} members={members} currentUserName={user.name} />
            </div>
          </div>

          <GroupTabs activeTab={activeTab} setActiveTab={setActiveTab} isSplit={selectedGroup.type === 'split'} />

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'feed' && (
              txLoading ? <FeedSkeleton /> : 
              <GroupFeed 
                transactions={txData} 
                group={selectedGroup} 
                currentUserId={user.id} 
                page={page} 
                setPage={setPage} 
                hasMore={txData?.length === limit} 
                onLogTransaction={() => setIsLogModalOpen(true)} 
                onDeleteTransaction={handleDeleteTransaction}
                actualMemberCount={members?.length || 1} 
              />
            )}
            {activeTab === 'balances' && (settlementsLoading ? <BalancesSkeleton /> : <GroupBalances settlements={settlements} currentUserName={user.name} />)}
            {activeTab === 'members' && (membersLoading ? <BalancesSkeleton /> : <GroupMembers members={members} currentUserId={user.id} group={selectedGroup} onRefreshCode={handleRefreshCode} />)}
            {activeTab === 'summary' && !txLoading && <GroupSummary transactions={txData} />}
          </div>

          {isLogModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 flex justify-between items-center border-b border-stone-100 dark:border-white/5 shrink-0">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Add Expense</h3>
                  <button onClick={() => setIsLogModalOpen(false)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleLogSubmit} className="space-y-5 mb-6">
                    
                    {/* Amount & Description */}
                    <div className="flex gap-3">
                      <div className="w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                          <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-7 pr-3 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="w-2/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
                        <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition-colors" placeholder="e.g., dinner" />
                      </div>
                    </div>

                    {/* Category & Payment Mode  */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)} className={`w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500 appearance-none ${!category ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          <option value="" disabled>Select category</option>
                          {globalCategories?.filter((c: any) => c.type === 'expense').map((c: any) => (
                              <option key={c.id} value={c.name} className="text-slate-900 dark:text-white">{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Paid Via</label>
                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 appearance-none">
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Net Banking">Net Banking</option>
                        </select>
                      </div>
                    </div>

                    {/* Split Type Selector & Inputs (Only for Split Groups) */}
                    {selectedGroup.type === 'split' && (
                      <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Split Options</label>
                        <div className="grid grid-cols-4 gap-2 bg-white dark:bg-black/20 p-1.5 rounded-xl border border-slate-100 dark:border-white/5 mb-3">
                          {['equal', 'exact', 'percentage', 'ratio'].map(type => (
                            <button
                              key={type} type="button"
                              onClick={() => { setSplitType(type); setSplitDetails({}); }}
                              className={`py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${splitType === type ? 'bg-slate-100 dark:bg-[#2a2a2a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                              {type === 'percentage' ? '%' : type}
                            </button>
                          ))}
                        </div>
                        
                        {splitType === 'equal' ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                             Splitting equally among {members?.length || 1} members.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                            {members?.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{m.name}</span>
                                <div className="flex items-center gap-2 w-28">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-right dark:text-white outline-none focus:border-blue-500"
                                    value={splitDetails[m.id] || ''}
                                    onChange={e => setSplitDetails({...splitDetails, [m.id]: e.target.value})}
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-slate-400 font-bold w-4">
                                    {splitType === 'percentage' ? '%' : splitType === 'exact' ? currency : 'x'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">
                      {isSubmitting ? 'Saving...' : `Save ${currency}${amount || '0.00'}`}
                    </button>
                  </form>

                  <div className="relative border-t border-stone-100 dark:border-white/5 pt-6 mt-6">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1a1a1a] px-3 text-xs font-bold text-slate-300 dark:text-slate-600">OR QUICK LOG</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3">
                      Log this expense directly from WhatsApp:
                    </p>
                    <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-center font-mono text-sm text-slate-700 dark:text-slate-300 mb-3">
                      {waCommand}
                    </div>
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <MessageCircle size={18} /> Open WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group Settings Modal */}
          {isSettingsOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                
                <div className="px-6 py-4 border-b border-stone-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Group Settings</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white dark:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="p-3">
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">General</div>
                  <button onClick={handleRenameGroup} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Edit2 size={18} /></div>
                    Rename Group
                  </button>
                  <button onClick={() => { setActiveTab('members'); setIsSettingsOpen(false); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left mt-1">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Users size={18} /></div>
                    Manage Members & Invites
                  </button>
                  
                  <div className="px-4 py-2 mt-4 text-xs font-bold text-rose-400/70 uppercase tracking-wider">Danger Zone</div>
                  <button onClick={handleLeaveGroup} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-colors text-rose-600 dark:text-rose-500 font-bold text-left">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl"><LogOut size={18} /></div>
                    Leave Group
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}