import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, X, Settings, Edit2, LogOut, MessageCircle, AlertTriangle, CheckCircle2, ChevronLeft, Plus, RefreshCw } from 'lucide-react';
import GroupHeader from '../Groups/components/GroupHeader';
import GroupTabs from '../Groups/components/GroupsTab';
import GroupFeed from '../Groups/components/GroupFeed';
import GroupSummary from '../Groups/components/GroupSummary';
import GroupBalances from '../Groups/components/GroupBalances';
import GroupMembers from '../Groups/components/GroupMembers';
import { FeedSkeleton, BalancesSkeleton, SummarySkeleton, MembersSkeleton } from '../Groups/components/GroupSkeletons';
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
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [newGroupTab, setNewGroupTab] = useState<'create' | 'join'>('create');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('split');
  const [joinCode, setJoinCode] = useState('');

  // Custom Action Modals
  const [editingTx, setEditingTx] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, actionText: string, isDanger: boolean, onConfirm: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: (val: string) => void } | null>(null);
  const [promptInputValue, setPromptInputValue] = useState(""); 
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, message: string } | null>(null);

  // Settle Up Modal
  const [settleModal, setSettleModal] = useState<{ isOpen: boolean, targetName: string, targetId: number, amount: number } | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState('UPI');
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [splitType, setSplitType] = useState('equal');
  const [splitDetails, setSplitDetails] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: groups, isLoading: groupsLoading, isError: isGroupsError, refetch: refetchGroups } = useQuery({
    queryKey: ['groups', user.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users/${user.id}/groups`);
      return res.data;
    }
  });

  const selectedGroup = groups?.find((g: Group) => g.id === selectedGroupId);

  const { data: globalCategories } = useQuery({
    queryKey: ['categories', user.id],
    queryFn: async () => (await axios.get(`${API_URL}/categories/${user.id}`)).data
  });

  const [limit, setLimit] = useState(15);

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['group-transactions', selectedGroupId, page, limit],
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return setAlertModal({ isOpen: true, message: "Group name is required." });
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/groups/create?name=${encodeURIComponent(newGroupName)}&user_id=${user.id}&type=${newGroupType}`);
      setIsNewGroupOpen(false);
      setNewGroupName('');
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Failed to create group." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return setAlertModal({ isOpen: true, message: "Invite code is required." });
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/groups/join?invite_code=${encodeURIComponent(joinCode.toUpperCase())}&user_id=${user.id}`);
      setIsNewGroupOpen(false);
      setJoinCode('');
      queryClient.invalidateQueries({ queryKey: ['groups', user.id] });
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.detail || "Invalid or expired invite code." });
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const handleRemoveMember = (targetId: number, targetName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Member",
      message: `Are you sure you want to remove ${targetName} from the group? They can only be removed if they have no pending balances.`,
      actionText: "Remove",
      isDanger: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/groups/${selectedGroupId}/members/${targetId}?user_id=${user.id}`);
          queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] });
          setAlertModal({ isOpen: true, message: `${targetName} has been removed from the group.` });
        } catch (err: any) {
          setAlertModal({ isOpen: true, message: err.response?.data?.detail || "Failed to remove member." });
        }
      }
    });
  };

  const handleSettleUpClick = (targetId: number, targetName: string, settleAmount: number) => {
    setSettlePaymentMode('UPI');
    setSettleAmountInput(settleAmount.toString());
    setSettleModal({ isOpen: true, targetName, targetId, amount: settleAmount });
  };

  const handleRemindClick = async (targetId: number, targetName: string, amount: number) => {
    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/remind`, {
        target_user_id: targetId,
        amount: amount,
        from_user_id: user.id
      });
      setAlertModal({ isOpen: true, message: `A WhatsApp reminder has been sent to ${targetName}!` });
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.detail || "Failed to send reminder." });
    }
  };

  const confirmSettleUp = async () => {
    if (!settleModal) return;
    const finalAmount = parseFloat(settleAmountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) return setAlertModal({ isOpen: true, message: "Please enter a valid amount." });

    try {
      await axios.post(`${API_URL}/groups/${selectedGroupId}/transactions`, {
        amount: finalAmount,
        description: 'Settlement',
        user_id: user.id,
        category_id: null,
        payment_mode: settlePaymentMode,
        split_type: 'settlement',
        split_details: { [settleModal.targetId]: finalAmount }
      });
      setSettleModal(null);
      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Failed to log settlement." });
    }
  };
  const handleEditTransaction = (tx: any) => {
    setAmount(tx.amount.toString());
    setDescription(tx.description);
    setCategory(tx.category_id?.toString() || '');
    setPaymentMode(tx.payment_mode || 'UPI');
    setSplitType(tx.split_type);

    if (tx.split_details) {
      const parsedDetails = typeof tx.split_details === 'string' ? JSON.parse(tx.split_details) : tx.split_details;
      setSplitDetails(parsedDetails);
      if (tx.split_type === 'equal') setSelectedMembers(Object.keys(parsedDetails));
    } else {
      setSplitDetails({});
      setSelectedMembers([]);
    }

    setEditingTx(tx);
    setIsLogModalOpen(true);
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
      const payload = {
        amount: numericAmount,
        description,
        user_id: user.id,
        category_id: parseInt(category),
        payment_mode: paymentMode,
        split_type: splitType,
        split_details: Object.keys(parsedSplitDetails).length > 0 ? parsedSplitDetails : null
      };

      if (editingTx) {
        await axios.put(`${API_URL}/groups/transactions/${editingTx.id}?user_id=${user.id}`, payload);
      } else {
        await axios.post(`${API_URL}/groups/${selectedGroupId}/transactions`, payload);
      }

      setAmount('');
      setDescription('');
      setCategory('');
      setSplitType('equal');
      setSplitDetails({});
      setEditingTx(null);
      setIsLogModalOpen(false);

      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
    } catch (err) {
      setAlertModal({ isOpen: true, message: "Failed to save transaction. Ensure server is online." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupAlias = selectedGroup ? selectedGroup.name.split(' ')[0].toLowerCase() : '';
  const waCommand = `@${groupAlias} ${amount || '100'} ${description || 'coffee'}`;
  const waLink = `https://wa.me/918796022992?text=${encodeURIComponent(waCommand)}`;

  if (groupsLoading) {
    return (
      <div className="max-w-3xl mx-auto w-full pb-24 animate-pulse">
        <div className="flex justify-between items-center mb-6 px-2">
          <div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2"></div>
            <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
          </div>
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/5 border border-stone-100 dark:border-white/5 shrink-0"></div>
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isGroupsError) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center py-20 animate-in fade-in">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Connection Error</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">We couldn't load your groups. Please check your internet connection.</p>
        <button onClick={() => refetchGroups()} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold rounded-xl transition-colors">
          <RefreshCw size={18} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full pb-24">
      {isNewGroupOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add Group</h3>
              <button onClick={() => setIsNewGroupOpen(false)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setNewGroupTab('create')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newGroupTab === 'create' ? 'bg-white dark:bg-[#2a2a2a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Create New
              </button>
              <button 
                onClick={() => setNewGroupTab('join')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newGroupTab === 'join' ? 'bg-white dark:bg-[#2a2a2a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Join Existing
              </button>
            </div>

            {newGroupTab === 'create' ? (
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Group Name</label>
                  <input type="text" required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 transition-colors" placeholder="e.g., Goa Trip, Flatmates" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Group Type</label>
                  <select value={newGroupType} onChange={(e) => setNewGroupType(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 appearance-none">
                    <option value="split">✂️ Split Group (Shared Expenses)</option>
                    <option value="family">🏡 Family (Tracking Only)</option>
                    <option value="couple">❤️ Couple (Tracking Only)</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md mt-2">
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Invite Code</label>
                  <input type="text" required value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center text-2xl font-mono text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-colors tracking-widest uppercase" placeholder="XXXXXX" />
                </div>
                <button type="submit" disabled={isSubmitting || joinCode.length < 6} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md mt-2">
                  {isSubmitting ? 'Joining...' : 'Join Group'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

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

      {settleModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Settle Up</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You owe <strong>{settleModal.targetName}</strong> a total of {currency}{settleModal.amount.toLocaleString()}.</p>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount to Pay Now</label>
            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">{currency}</span>
              <input 
                type="number" 
                step="0.01" 
                value={settleAmountInput} 
                onChange={(e) => setSettleAmountInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-2xl text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-colors" 
              />
            </div>

            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Payment Mode</label>
            <select 
              value={settlePaymentMode} 
              onChange={(e) => setSettlePaymentMode(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500 appearance-none mb-8"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>

            <div className="flex gap-3">
              <button onClick={() => setSettleModal(null)} className="flex-1 py-3.5 font-bold rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={confirmSettleUp} className="flex-1 py-3.5 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">Mark as Paid</button>
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

      {!selectedGroupId ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Groups</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your shared expenses</p>
            </div>
            
            <button onClick={() => setIsNewGroupOpen(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 px-4 py-2.5 rounded-full font-bold text-sm transition-colors shadow-sm">
              <Plus size={18} /> New
            </button>
            
          </div>

          {!groups || groups.length === 0 ? (
            <div className="bg-white dark:bg-[#1a1a1a] p-10 rounded-[2rem] border border-stone-100 dark:border-white/5 text-center shadow-sm mt-4">
              <Users className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Groups Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Create a group or ask a friend for an invite code.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g: Group) => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroupId(g.id); setActiveTab('feed'); setPage(1); }}
                  className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-white/10 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                      {g.type === 'family' ? '🏡' : g.type === 'split' ? '✂️' : '👥'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{g.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">{g.type} • {g.max_members} limit</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <ChevronLeft size={20} className="rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (

        <div className="bg-slate-50 dark:bg-[#121212] rounded-[2.5rem] border border-stone-100 dark:border-white/5 p-4 sm:p-8 flex flex-col min-h-[600px] relative shadow-sm animate-in slide-in-from-right-4 duration-300">

          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setSelectedGroupId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold text-sm bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-stone-200 dark:border-white/10 shadow-sm transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-white/10 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm transition-all hover:scale-105"
            >
              <Settings size={18} />
            </button>
          </div>

          {selectedGroup && (
            <>
              <div className="mb-2">
                <GroupHeader group={selectedGroup} settlements={settlements} totalSpend={settlements?.total_spend || 0} members={members} currentUserName={user.name} />
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
                    limit={limit}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit); 
                        setPage(1);
                    }}
                    hasMore={txData?.length === limit} 
                    onLogTransaction={() => setIsLogModalOpen(true)}
                    onEditTransaction={handleEditTransaction} 
                    onDeleteTransaction={handleDeleteTransaction}
                    actualMemberCount={members?.length || 1} 
                  />
                )}
                {activeTab === 'balances' && (
                  settlementsLoading ? <BalancesSkeleton /> : 
                  <GroupBalances 
                    settlements={settlements} 
                    currentUserId={user.id}
                    onSettle={handleSettleUpClick} 
                    onRemind={handleRemindClick}
                  />
                )}

                {activeTab === 'members' && (
                  membersLoading ? <MembersSkeleton /> : 
                  <GroupMembers members={members} currentUserId={user.id} group={selectedGroup} onRefreshCode={handleRefreshCode} onRemoveMember={handleRemoveMember} />
                )}

                {activeTab === 'summary' && (
                  txLoading ? <SummarySkeleton /> : 
                  <GroupSummary transactions={txData} />
                )}

              </div>
            </>
          )}

          {/* Web Logging Form Modal */}
          {isLogModalOpen && selectedGroup && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 flex justify-between items-center border-b border-stone-100 dark:border-white/5 shrink-0">
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
                              <option key={c.id} value={c.id} className="text-slate-900 dark:text-white">{c.icon} {c.name}</option> 
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
          {isSettingsOpen && selectedGroup && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1e1e1e] rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                <div className="px-6 py-5 border-b border-stone-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Group Settings</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white dark:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">General</div>
                  <button onClick={() => { setIsSettingsOpen(false); handleRenameGroup(); }} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Edit2 size={18} /></div>
                    Rename Group
                  </button>
                  <button onClick={() => { setActiveTab('members'); setIsSettingsOpen(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-700 dark:text-slate-200 font-medium text-left mt-2">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Users size={18} /></div>
                    Manage Members & Invites
                  </button>

                  <div className="px-4 py-2 mt-6 text-[10px] font-bold text-rose-400/70 uppercase tracking-wider mb-2">Danger Zone</div>
                  <button onClick={() => { setIsSettingsOpen(false); handleLeaveGroup(); }} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-colors text-rose-600 dark:text-rose-500 font-bold text-left">
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