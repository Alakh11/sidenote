import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { Users, Copy, Trash2, Edit2, ArrowRightLeft, Receipt, Clock, Info } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

const API_URL = "https://api.sidenote.in";

export default function GroupsTab() {
  const router = useRouter();
  const user = router.options.context?.user!;
  const { currency } = usePreferences();

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [settlements, setSettlements] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'settlements'>('ledger');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/${user.id}/groups`);
      setGroups(res.data);
      if (res.data.length > 0 && !selectedGroup) {
        handleSelectGroup(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: any) => {
    setSelectedGroup(group);
    setActiveTab('ledger');
    
    try {
      const [txRes, setRes] = await Promise.all([
        axios.get(`${API_URL}/groups/${group.id}/transactions`),
        axios.get(`${API_URL}/groups/${group.id}/settlements`)
      ]);
      setTransactions(txRes.data);
      setSettlements(setRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(`join ${code}`);
    alert(`Copied: "join ${code}"\nSend this to a friend so they can text it to the bot!`);
  };

  const handleEditGroup = async () => {
    const newName = prompt("Enter new group name:", selectedGroup.name);
    if (!newName || newName === selectedGroup.name) return;

    try {
      await axios.put(`${API_URL}/groups/${selectedGroup.id}`, { name: newName });
      fetchGroups();
      setSelectedGroup({ ...selectedGroup, name: newName });
    } catch (err) {
      alert("Failed to update group name.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${selectedGroup.name}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/groups/${selectedGroup.id}`);
      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      alert("Failed to delete group.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading your groups...</div>;

  if (groups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-stone-50 dark:border-slate-800 text-center shadow-sm">
        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Groups Yet</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          Create a group on WhatsApp by texting <br/>
          <strong className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg inline-block mt-2">create family group Home</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      
      {/* Sidebar: Group List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2">Your Shared Ledgers</h3>
        <div className="flex flex-col gap-3">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleSelectGroup(g)}
              className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                selectedGroup?.id === g.id 
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' 
                : 'bg-white border-stone-100 hover:border-stone-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                 <div className="font-bold text-slate-800 dark:text-white truncate pr-2">{g.name}</div>
                 {g.type && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/50 border border-black/5 dark:bg-slate-800 dark:border-white/5 text-slate-500 dark:text-slate-400 shrink-0">
                       {g.type}
                    </span>
                 )}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Code: {g.invite_code}</span>
                {selectedGroup?.id === g.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Selected Group Details */}
      {selectedGroup && (
        <div className="w-full lg:w-2/3 bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-50 dark:border-slate-800 p-6 md:p-8 flex flex-col min-h-[500px] shadow-sm">
          
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedGroup.name}</h2>
                 {selectedGroup.type && (
                     <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                        {selectedGroup.type} (Max {selectedGroup.max_members})
                     </span>
                 )}
              </div>
              
              <div className="flex items-center gap-3 mt-3">
                  <button 
                    onClick={() => copyInviteCode(selectedGroup.invite_code)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition border border-blue-100 dark:border-blue-800/50"
                  >
                    <Copy size={12} /> Invite Code: {selectedGroup.invite_code}
                  </button>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                     <Clock size={10} /> Valid 30m after creation
                  </span>
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button onClick={handleEditGroup} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition" title="Rename Group">
                <Edit2 size={16} />
              </button>
              <button onClick={handleDeleteGroup} className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition" title="Delete Group">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Quick Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-2 mb-8">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                 To add an expense, text the bot: <strong className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 ml-1">@{selectedGroup.name.split(' ')[0].toLowerCase()} 500 dinner</strong>
              </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-stone-100 dark:border-slate-800 mb-6">
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Receipt size={16} /> Ledger
            </button>
            <button 
              onClick={() => setActiveTab('settlements')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'settlements' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <ArrowRightLeft size={16} /> Settlements
            </button>
          </div>

          {/* Ledger Tab Content */}
          {activeTab === 'ledger' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="text-center text-slate-400 italic mt-10">No expenses logged in this group yet.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-stone-100 dark:border-slate-700/50 shadow-sm hover:border-blue-100 dark:hover:border-blue-900/50 transition">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white capitalize">{t.description}</div>
                        <div className="text-xs text-slate-500 mt-1">
                           Paid by <span className="font-bold text-slate-700 dark:text-slate-300">{t.paid_by}</span>
                        </div>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-white text-lg bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-stone-100 dark:border-slate-800">
                        {currency}{t.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settlements Tab Content */}
          {activeTab === 'settlements' && settlements && (
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border border-stone-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Group Spend</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">{currency}{settlements.total_spend.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30">
                  <div className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70 mb-1 uppercase tracking-wider">Split Per Person</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{currency}{settlements.per_person.toLocaleString()}</div>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                 Who owes who?
              </h3>
              
              {settlements.settlements.length === 0 ? (
                <div className="text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center gap-2">
                  <span className="text-3xl">🎉</span>
                  All settled up! Nobody owes anything.
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.settlements.map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-stone-100 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">{s.from}</span>
                        <ArrowRightLeft size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">{s.to}</span>
                      </div>
                      <div className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-800/30">
                        {currency}{s.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}