import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, X, Settings, Edit2, LogOut, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import GroupHeader from '../Groups/components/GroupHeader';
import GroupTabs from '../Groups/components/GroupsTab';
import GroupFeed from '../Groups/components/GroupFeed';
import GroupSummary from '../Groups/components/GroupSummary';
import GroupBalances from '../Groups/components/GroupBalances';
import GroupMembers from '../Groups/components/GroupMembers';
import { FeedSkeleton, BalancesSkeleton } from '../Groups/components/GroupSkeletons';
import { usePreferences } from '../../context/PreferencesContext';

export interface Group {
  id: number;
  name: string;
  type: 'couple' | 'family' | 'split';
  max_members: number;
  invite_code: string;
  invite_expires_at: string;
}

export interface Member {
  id: number;
  name: string;
  nickname: string | null;
  email: string;
  role: 'admin' | 'member';
}

const API_URL = import.meta.env.VITE_API_URL;

export default function GroupDashboard() {
  const router = useRouter();
  const user = router.options.context?.user!;
  const queryClient = useQueryClient();
  const { currency } = usePreferences();

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'balances' | 'summary' | 'members'>('feed');
  const [page, setPage] = useState(1);
  
  // Base Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Custom Action Modals
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, actionText: string, isDanger: boolean, onConfirm: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: (val: string) => void } | null>(null);
  const [promptInputValue, setPromptInputValue] = useState(""); // Fixed DOM Manipulation
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, message: string } | null>(null);
  
  // Settle Up Modal (Removes hardcoded UPI)
  const [settleModal, setSettleModal] = useState<{ isOpen: boolean, targetName: string, targetId: number, amount: number } | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState('UPI');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [splitType, setSplitType] = useState('equal');
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users/${user.id}/groups`);
      if (res.data.length > 0 && !selectedGroupId) setSelectedGroupId(res.data[0].id);
      return res.data;
    }
  });

  const selectedGroup = groups?.find((g: Group) => g.id === selectedGroupId);

  const { data: globalCategories } = useQuery({
    queryKey: ['categories', user.id],
    queryFn: async () => (await axios.get(`${API_URL}/categories/${user.id}`)).data
  });

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

  useEffect(() => {
    if (isLogModalOpen && members && splitType === 'equal') {
      setSelectedMembers(members.map((m: Member) => m.id.toString()));
    }
  }, [isLogModalOpen, members, splitType]);

  // Actions
  const handleDeleteTransaction = (txId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Transaction",
      message: "Are you sure you want to delete this? Group balances will be recalculated automatically.",
      actionText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/groups/transactions/${txId}?user_id=${user.id}`);
          queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
          queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
        } catch (err) {
          setAlertModal({ isOpen: true, message: "Failed to delete transaction. You can only delete transactions you logged." });
        }
      }
    });
  };

  const handleSettleUpClick = (targetName: string, settleAmount: number) => {
    const targetUser = members?.find((m: Member) => m.name === targetName || m.nickname === targetName);
    if(!targetUser) return setAlertModal({ isOpen: true, message: "Could not find member details." });
    
    setSettlePaymentMode('UPI'); // Reset to default
    setSettleModal({ isOpen: true, targetName, targetId: targetUser.id, amount: settleAmount });
  };

  const confirmSettleUp = async () => {
    if (!settleModal) return;
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/transactions`, {
        amount: settleModal.amount,
        description: 'Settlement',
        user_id: user.id,
        category: 'general',
        payment_mode: settlePaymentMode,
        split_type: 'settlement',
        split_details: { [settleModal.targetId]: settleModal.amount }
      });
      setSettleModal(null);
      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Failed to log settlement." });
    }
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: "Leave Group",
      message: `Are you sure you want to leave ${selectedGroup.name}? Your history will remain but you will lose access. Ensure your balances are settled.`,
      actionText: "Leave",
      isDanger: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/groups/${selectedGroupId}?user_id=${user.id}`);
          setIsSettingsOpen(false);
          setSelectedGroupId(null);
          queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
        } catch (err: any) {
          setAlertModal({ isOpen: true, message: err.response?.data?.detail || "Failed to leave group." });
        }
      }
    });
  };

  const handleRenameGroup = () => {
    setPromptInputValue(selectedGroup.name);
    setPromptModal({
      isOpen: true,
      title: "Rename Group",
      message: "Enter a new name for this shared ledger:",
      onConfirm: async (newName) => {
        try {
          await axios.put(`${API_URL}/groups/${selectedGroupId}`, { name: newName });
          queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
        } catch (err) {
          setAlertModal({ isOpen: true, message: "Failed to update group name." });
        }
      }
    });
  };

  const handleRefreshCode = async () => {
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/refresh-code?user_id=${user.id}`);
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Failed to generate a new invite code." });
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return setAlertModal({ isOpen: true, message: "Please fill all required fields." });
    
    let parsedSplitDetails: Record<string, number> = {};
    const numericAmount = parseFloat(amount) || 0;

    if (selectedGroup?.type === 'split') {
      if (splitType === 'equal') {
        if (selectedMembers.length === 0) return setAlertModal({ isOpen: true, message: "You must select at least one member to split the cost with." });
        const share = numericAmount / selectedMembers.length;
        selectedMembers.forEach(id => parsedSplitDetails[id] = share);
      } 
      else if (splitType === 'percentage') {
        let totalPct = 0;
        Object.keys(splitDetails).forEach(id => {
          const pct = parseFloat(splitDetails[id]) || 0;
          totalPct += pct;
          parsedSplitDetails[id] = (pct / 100) * numericAmount;
        });
        if (Math.abs(totalPct - 100) > 0.01) return setAlertModal({ isOpen: true, message: `Percentages must add up exactly to 100%. Currently at ${totalPct}%.` });
      } 
      else if (splitType === 'ratio') {
        let totalShares = 0;
        Object.keys(splitDetails).forEach(id => totalShares += (parseFloat(splitDetails[id]) || 0));
        if (totalShares <= 0) return setAlertModal({ isOpen: true, message: "Total ratio shares must be greater than 0." });
        
        Object.keys(splitDetails).forEach(id => {
          const shares = parseFloat(splitDetails[id]) || 0;
          parsedSplitDetails[id] = (shares / totalShares) * numericAmount;
        });
      } 
      else if (splitType === 'exact') {
        let totalExact = 0;
        Object.keys(splitDetails).forEach(id => {
          const val = parseFloat(splitDetails[id]) || 0;
          totalExact += val;
          parsedSplitDetails[id] = val;
        });
        if (Math.abs(totalExact - numericAmount) > 0.01) return setAlertModal({ isOpen: true, message: `Exact amounts must add up to ${currency}${numericAmount}. Currently at ${currency}${totalExact}.` });
      }
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/transactions`, {
        amount: numericAmount,
        description,
        user_id: user.id,
        category,
        payment_mode: paymentMode,
        split_type: splitType,
        split_details: Object.keys(parsedSplitDetails).length > 0 ? parsedSplitDetails : null
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
      setAlertModal({ isOpen: true, message: "Failed to log transaction. Ensure server is online." });
    } finally {
      setIsSubmitting(false);
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
  const waCommand = `@${groupAlias} ${amount || '100'} ${description || 'coffee'}`;
  const waLink = `https://wa.me/918796022992?text=${encodeURIComponent(waCommand)}`;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Custom Reusable Modals */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className={`flex-1 py-3 font-bold rounded-xl text-white transition-colors shadow-sm ${confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmModal.actionText}</button>
            </div>
          </div>
        </div>
      )}

      {promptModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{promptModal.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{promptModal.message}</p>
            <input 
              type="text" 
              autoFocus
              value={promptInputValue} 
              onChange={(e) => setPromptInputValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setPromptModal(null)} className="flex-1 py-3 font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => { promptModal.onConfirm(promptInputValue); setPromptModal(null); }} className="flex-1 py-3 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {settleModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Settle Up</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Record a payment to <strong>{settleModal.targetName}</strong> for {currency}{settleModal.amount.toLocaleString()}</p>
            
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Mode</label>
            <select 
              value={settlePaymentMode} 
              onChange={(e) => setSettlePaymentMode(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 appearance-none mb-6"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>

            <div className="flex gap-3">
              <button onClick={() => setSettleModal(null)} className="flex-1 py-3 font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={confirmSettleUp} className="flex-1 py-3 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">Mark as Paid</button>
            </div>
          </div>
        </div>
      )}

      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[105] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center border border-slate-100 dark:border-white/5">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-slate-800 dark:text-white font-medium mb-6">{alertModal.message}</p>
            <button onClick={() => setAlertModal(null)} className="w-full py-3 font-bold rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">Okay</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2">Shared Ledgers</h3>
        <div className="flex flex-col gap-3">
          {groups.map((g: Group) => (
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
            {activeTab === 'balances' && (settlementsLoading ? <BalancesSkeleton /> : <GroupBalances settlements={settlements} currentUserName={user.name} onSettle={handleSettleUpClick} />)}
            {activeTab === 'members' && (membersLoading ? <BalancesSkeleton /> : <GroupMembers members={members} currentUserId={user.id} group={selectedGroup} onRefreshCode={handleRefreshCode} />)}
            {activeTab === 'summary' && !txLoading && <GroupSummary transactions={txData} />}
          </div>

          {/* Web Logging Form Modal */}
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
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {members?.map((m: Member) => {
                            const isMe = m.id === user.id;
                            const isSelected = selectedMembers.includes(m.id.toString());
                            
                            if (splitType === 'equal') {
                               return (
                                 <label key={m.id} className="flex justify-between items-center cursor-pointer group">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-600'}`}>
                                        {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                      </div>
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {m.name} {isMe && <span className="text-[9px] ml-1 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500">(You)</span>}
                                      </span>
                                   </div>
                                   <input 
                                     type="checkbox" 
                                     className="hidden" 
                                     checked={isSelected}
                                     onChange={(e) => {
                                        if (e.target.checked) setSelectedMembers([...selectedMembers, m.id.toString()]);
                                        else setSelectedMembers(selectedMembers.filter(id => id !== m.id.toString()));
                                     }}
                                   />
                                 </label>
                               );
                            }
                            
                            return (
                              <div key={m.id} className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{m.name} {isMe && <span className="text-[9px] text-slate-500 ml-1">(You)</span>}</span>
                                <div className="flex items-center gap-2 w-28">
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-xs text-right dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    value={splitDetails[m.id] || ''}
                                    onChange={e => setSplitDetails({...splitDetails, [m.id]: e.target.value})}
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-slate-400 font-bold w-4 text-center">
                                    {splitType === 'percentage' ? '%' : splitType === 'exact' ? currency : 'x'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                
                <div className="px-6 py-4 border-b border-stone-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Group Settings</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white dark:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="p-3">
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">General</div>
                  <button onClick={() => { setIsSettingsOpen(false); handleRenameGroup(); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Edit2 size={18} /></div>
                    Rename Group
                  </button>
                  <button onClick={() => { setActiveTab('members'); setIsSettingsOpen(false); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left mt-1">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Users size={18} /></div>
                    Manage Members & Invites
                  </button>
                  
                  <div className="px-4 py-2 mt-4 text-xs font-bold text-rose-400/70 uppercase tracking-wider">Danger Zone</div>
                  <button onClick={() => { setIsSettingsOpen(false); handleLeaveGroup(); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-colors text-rose-600 dark:text-rose-500 font-bold text-left">
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