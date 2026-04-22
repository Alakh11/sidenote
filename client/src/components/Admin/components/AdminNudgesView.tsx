import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MasterNudgeControl from './MasterNudgeControl';
import RuleEngineGrid from './RuleEngineGrid';
import AutomatedNudgeHistory from './AutomatedNudgeHistory';
import RuleFormModal from './RuleFormModal';
import { LayoutGrid, List } from 'lucide-react';

export default function AdminNudgesView() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const LIMIT = 10;
    const API_URL = "https://api.sidenote.in";

    const [activeSubTab, setActiveSubTab] = useState<'rules' | 'history'>('rules');

    const [cronStatus, setCronStatus] = useState<{status: 'running' | 'paused' | 'offline', next_run: string | null}>({ status: 'offline', next_run: null });
    const [togglingCron, setTogglingCron] = useState(false);
    const [rules, setRules] = useState<any[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);

    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);

    const [nudgeLogs, setNudgeLogs] = useState<any[]>([]);
    const [loadingNudges, setLoadingNudges] = useState(true);
    const [nudgePage, setNudgePage] = useState(1);
    const [nudgeTotal, setNudgeTotal] = useState(0);
    const [nudgeSortBy, setNudgeSortBy] = useState('sent_at');
    const [nudgeSortOrder, setNudgeSortOrder] = useState('DESC');

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user_data');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj.role === 'superadmin') setIsSuperAdmin(true);
            }
        } catch (e) { console.error("Failed to parse user role"); }
    }, []);

    const formatTime = (dateString: string) => {
        if (!dateString || dateString === 'None' || dateString === 'Paused') return 'N/A';
        const safeString = dateString.replace(' ', 'T');
        return new Date(safeString).toLocaleString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    // --- API Fetchers ---
    const fetchCronStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/cron-status`, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus({ status: res.data.status, next_run: res.data.next_run });
        } catch (error) { }
    }, []);

    const fetchRules = useCallback(async () => {
        setLoadingRules(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/rules`, { headers: { Authorization: `Bearer ${token}` } });
            setRules(res.data);
        } catch (error) { } finally { setLoadingRules(false); }
    }, []);

    const fetchNudges = useCallback(async () => {
        setLoadingNudges(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/admin/engagement/logs?page=${nudgePage}&limit=${LIMIT}&sort_by=${nudgeSortBy}&sort_order=${nudgeSortOrder}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNudgeLogs(res.data.data);
            setNudgeTotal(res.data.total);
        } catch (error) { } finally { setLoadingNudges(false); }
    }, [nudgePage, nudgeSortBy, nudgeSortOrder]);

    useEffect(() => {
        fetchCronStatus();
        fetchRules();
        fetchNudges();
    }, [fetchCronStatus, fetchRules, fetchNudges]);

    const handleNudgeSort = (field: string) => {
        if (nudgeSortBy === field) {
            setNudgeSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setNudgeSortBy(field);
            setNudgeSortOrder('ASC');
        }
    };

    // --- Actions ---
    const handleToggleCron = async () => {
        setTogglingCron(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/cron-toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setCronStatus({ status: res.data.status, next_run: res.data.next_run });
        } catch (error: any) { alert("Failed to toggle engine."); }
        setTogglingCron(false);
    };

    const handleToggleRule = async (ruleName: string, currentStatus: boolean) => {
        setRules(prevRules => prevRules.map(rule => 
            rule.rule_name === ruleName ? { ...rule, is_active: !currentStatus } : rule
        ));

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/admin/engagement/rules/${ruleName}`, { is_active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) { 
            alert("Failed to update rule. Reverting."); 
            setRules(prevRules => prevRules.map(rule => 
                rule.rule_name === ruleName ? { ...rule, is_active: currentStatus } : rule
            ));
        }
    };

    const handleForceFireRule = async (ruleName: string) => {
        if (!confirm(`Force trigger the "${ruleName.replace(/_/g, ' ')}" rule now?`)) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/trigger-nudges`, { nudge_type: ruleName }, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            setTimeout(() => { setNudgePage(1); fetchNudges(); fetchRules(); setIsTriggering(false); }, 1500);
        } catch (error: any) { alert(error.response?.data?.detail || "Failed."); setIsTriggering(false); }
    };

    const handleFlushAndTrigger = async () => {
        if (!confirm("SUPERADMIN ACTION: Delete all previous logs and run fresh? This cannot be undone.")) return;
        setIsTriggering(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/admin/engagement/flush-and-trigger`, {}, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            setTimeout(() => { setNudgePage(1); fetchNudges(); fetchRules(); setIsTriggering(false); }, 2500);
        } catch (error: any) { alert(error.response?.data?.detail || "Denied."); setIsTriggering(false); }
    };

    const handleSaveRule = async (data: any) => {
        try {
            const token = localStorage.getItem('token');
            if (editingRule) {
                await axios.put(`${API_URL}/admin/engagement/rules/edit/${editingRule.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${API_URL}/admin/engagement/rules`, data, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsRuleModalOpen(false);
            setEditingRule(null);
            fetchRules();
        } catch (e: any) { alert("Failed to save rule."); }
    };

    const handleDeleteRule = async (id: number) => {
        if (!confirm("Permanently delete this rule? This cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/admin/engagement/rules/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchRules();
        } catch (e) { alert("Failed to delete rule."); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            <div className="flex bg-stone-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveSubTab('rules')}
                    className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeSubTab === 'rules' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <LayoutGrid size={16} /> Rule Engine Grid
                </button>
                <button
                    onClick={() => setActiveSubTab('history')}
                    className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeSubTab === 'history' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white'}`}
                >
                    <List size={16} /> Nudge History Logs
                </button>
            </div>

            {activeSubTab === 'rules' && isSuperAdmin && (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                    
                    <div className="relative">
                        {cronStatus.next_run && cronStatus.status === 'running' && (
                            <div className="flex justify-end mb-2">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 px-3 py-1 rounded-full font-mono shadow-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Next run: {formatTime(cronStatus.next_run)}
                                </span>
                            </div>
                        )}
                        
                        <MasterNudgeControl
                            cronStatus={cronStatus.status as any} 
                            togglingCron={togglingCron}
                            isTriggering={isTriggering}
                            onToggleCron={handleToggleCron}
                            onForceFireAll={() => handleForceFireRule('all')}
                            onFlushAndTrigger={handleFlushAndTrigger}
                        />
                    </div>

                    <RuleEngineGrid
                        rules={rules} 
                        loadingRules={loadingRules} 
                        isTriggering={isTriggering}
                        onToggleRule={handleToggleRule} 
                        onForceFireRule={handleForceFireRule}
                        onAddRule={() => { setEditingRule(null); setIsRuleModalOpen(true); }}
                        onEditRule={(rule: any) => { setEditingRule(rule); setIsRuleModalOpen(true); }}
                        onDeleteRule={handleDeleteRule}
                    />
                </div>
            )}

            {activeSubTab === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <AutomatedNudgeHistory
                        logs={nudgeLogs}
                        loading={loadingNudges}
                        page={nudgePage}
                        total={nudgeTotal}
                        limit={LIMIT}
                        sortBy={nudgeSortBy}
                        sortOrder={nudgeSortOrder}
                        onSort={handleNudgeSort}
                        onPageChange={setNudgePage}
                    />
                </div>
            )}

            {isRuleModalOpen && (
                <RuleFormModal
                    editingRule={editingRule}
                    onClose={() => { setIsRuleModalOpen(false); setEditingRule(null); }}
                    onSave={handleSaveRule}
                />
            )}
        </div>
    );
}