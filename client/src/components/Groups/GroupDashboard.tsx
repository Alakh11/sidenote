import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, X } from 'lucide-react';
import GroupHeader from '../Groups/components/GroupHeader';
import GroupTabs from '../Groups/components/GroupsTab';
import GroupFeed from '../Groups/components/GroupFeed';
import GroupSummary from '../Groups/components/GroupSummary';
import GroupBalances from '../Groups/components/GroupBalances';
import GroupMembers from '../Groups/components/GroupMembers';
import { FeedSkeleton, BalancesSkeleton } from '../Groups/components/GroupSkeletons';

const API_URL = "https://api.sidenote.in";

export default function GroupDashboard() {
  const router = useRouter();
  const user = router.options.context?.user!;
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'balances' | 'summary' | 'members'>('feed');
  const [page, setPage] = useState(1);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // 1. Fetch All Groups for Sidebar
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users/${user.id}/groups`);
      if (res.data.length > 0 && !selectedGroupId) setSelectedGroupId(res.data[0].id);
      return res.data;
    }
  });

  const selectedGroup = groups?.find((g: any) => g.id === selectedGroupId);

  // 2. Fetch Tab-Specific Data
  const limit = 15;
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['group-transactions', selectedGroupId, page],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/groups/${selectedGroupId}/transactions?page=${page}&limit=${limit}`);
      return res.data;
    },
    enabled: !!selectedGroupId && (activeTab === 'feed' || activeTab === 'summary'),
  });

  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['group-settlements', selectedGroupId],
    queryFn: async () => (await axios.get(`${API_URL}/groups/${selectedGroupId}/settlements`)).data,
    enabled: !!selectedGroupId && activeTab === 'balances',
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroupId],
    queryFn: async () => (await axios.get(`${API_URL}/groups/${selectedGroupId}/members`)).data,
    enabled: !!selectedGroupId && activeTab === 'members',
  });

  const handleDeleteTransaction = async (txId: number) => {
    if (!window.confirm("Are you sure you want to delete this transaction? It will recalculate settlements for everyone.")) return;

    try {
      await axios.delete(`${API_URL}/groups/transactions/${txId}?user_id=${user.id}`);
      
      queryClient.invalidateQueries({ queryKey: ['group-transactions', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', selectedGroupId] });
      
    } catch (err) {
      alert("Failed to delete transaction. You can only delete transactions you logged.");
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

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Sidebar: Group List */}
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

      {/* Main Content Area */}
      {selectedGroup && (
        <div className="w-full lg:w-2/3 bg-slate-50 dark:bg-[#121212] rounded-[2rem] border border-stone-100 dark:border-white/5 p-6 md:p-8 flex flex-col min-h-[600px] relative shadow-sm">
          
          <GroupHeader group={selectedGroup} settlements={settlements} totalSpend={settlements?.total_spend || 0} />
          <GroupTabs activeTab={activeTab} setActiveTab={setActiveTab} isSplit={selectedGroup.type === 'split'} />

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Feed Tab */}
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
              />
            )}
            
            {/* Balances Tab */}
            {activeTab === 'balances' && (
              settlementsLoading ? <BalancesSkeleton /> : 
              <GroupBalances settlements={settlements} currentUserName={user.name} />
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              membersLoading ? <BalancesSkeleton /> : 
              <GroupMembers members={members} currentUserId={user.id} />
            )}
            
            {/* Summary Tab */}
            {activeTab === 'summary' && !txLoading && <GroupSummary transactions={txData} />}
          </div>

          {/* Simple Web Log Modal */}
          {isLogModalOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2rem]">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-stone-100 dark:border-slate-800 m-4 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg dark:text-white">Log Expense</h3>
                  <button onClick={() => setIsLogModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                  For the fastest experience, log this expense directly from WhatsApp:
                </p>
                <div className="bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5 text-center font-mono text-sm text-slate-800 dark:text-slate-300">
                  @{selectedGroup.name.split(' ')[0].toLowerCase()} 100 coffee
                </div>
                <a href={`https://wa.me/YOUR_BOT_NUMBER?text=@${selectedGroup.name.split(' ')[0].toLowerCase()} `} target="_blank" className="w-full mt-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 rounded-xl block text-center transition">
                  Open WhatsApp
                </a>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}