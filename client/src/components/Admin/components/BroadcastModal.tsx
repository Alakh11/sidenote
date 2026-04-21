import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Send, X, AlertTriangle, MessageSquare, LayoutTemplate, Clock } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

export default function BroadcastModal({ onClose, selectedUserIds }: { onClose: () => void, selectedUserIds: number[] }) {
    const [messageType, setMessageType] = useState<'template' | 'text'>('template');
    const [templateName, setTemplateName] = useState('sidenote_welcome_v1');
    const [variables, setVariables] = useState('');
    const [messageText, setMessageText] = useState('');
    
    const [sendToAll, setSendToAll] = useState(selectedUserIds.length === 0);
    const [audienceFilter, setAudienceFilter] = useState<'all' | 'active_24h'>('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (messageType === 'text') {
            setAudienceFilter('active_24h');
        }
    }, [messageType]);

    const handleSend = async () => {
        const targetCount = sendToAll ? "ALL verified users" : `${selectedUserIds.length} selected users`;
        if (!confirm(`Blast this ${messageType === 'text' ? 'text message' : 'template'} to ${targetCount} via WhatsApp?`)) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                message_type: messageType,
                template_name: messageType === 'template' ? templateName : null,
                variables: messageType === 'template' && variables.trim() ? variables.split(',').map(s => s.trim()) : [],
                message_text: messageType === 'text' ? messageText : null,
                target_user_ids: sendToAll ? [] : selectedUserIds,
                audience: audienceFilter
            };
            
            const res = await axios.post(`${API_URL}/admin/broadcast`, payload, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            alert(res.data.message);
            onClose();
        } catch (e: any) {
            alert(e.response?.data?.detail || "Broadcast failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-stone-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        <Megaphone size={20} className="text-emerald-500"/> Custom Broadcast
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-5">
                    {/* User Target Toggle */}
                    <div className="flex gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl">
                        <button 
                            onClick={() => setSendToAll(false)} 
                            disabled={selectedUserIds.length === 0}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!sendToAll ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30'}`}
                        >
                            Selected Users ({selectedUserIds.length})
                        </button>
                        <button 
                            onClick={() => setSendToAll(true)} 
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${sendToAll ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700'}`}
                        >
                            All Verified Users
                        </button>
                    </div>

                    {/* Message Format Toggle */}
                    <div className="flex gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl">
                        <button 
                            onClick={() => setMessageType('template')} 
                            className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition ${messageType === 'template' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700'}`}
                        >
                            <LayoutTemplate size={16} /> Official Template
                        </button>
                        <button 
                            onClick={() => setMessageType('text')} 
                            className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition ${messageType === 'text' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700'}`}
                        >
                            <MessageSquare size={16} /> Free-form Text
                        </button>
                    </div>

                    {/* 24-Hour Filter Toggle */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between transition ${audienceFilter === 'active_24h' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-stone-50 border-stone-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                        <div className="flex items-start gap-2.5">
                            <Clock size={16} className={`mt-0.5 ${audienceFilter === 'active_24h' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`} />
                            <div>
                                <p className={`text-sm font-bold leading-none ${audienceFilter === 'active_24h' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-700 dark:text-slate-300'}`}>Smart 24h Filter</p>
                                <p className={`text-xs mt-1 leading-tight ${audienceFilter === 'active_24h' ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-stone-500'}`}>Only target users active in the last 24 hours.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={audienceFilter === 'active_24h'} 
                                onChange={(e) => setAudienceFilter(e.target.checked ? 'active_24h' : 'all')} 
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    {messageType === 'template' ? (
                        <>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                                Templates apply standard Meta billing rates. Ideal for reactivating users outside the 24h window.
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Template Name (Meta API)</label>
                                <input 
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition font-mono text-sm" 
                                    value={templateName} 
                                    onChange={e => setTemplateName(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-stone-400 ml-1 flex items-center gap-1">Variables (Comma Separated)</label>
                                <textarea 
                                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none text-sm" 
                                    rows={3}
                                    placeholder="e.g., Variable 1, Variable 2..."
                                    value={variables} 
                                    onChange={e => setVariables(e.target.value)} 
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>Free-form texts bypass Meta's template billing, but will <strong>FAIL</strong> if sent to users outside the 24-hour service window.</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Message Body</label>
                                <textarea 
                                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none text-sm" 
                                    rows={5}
                                    placeholder="Type your exact message here..."
                                    value={messageText} 
                                    onChange={e => setMessageText(e.target.value)} 
                                />
                            </div>
                        </>
                    )}
                </div>
                
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3.5 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50" disabled={loading}>Cancel</button>
                    
                    <button onClick={handleSend} disabled={loading} className="flex-1 py-3.5 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50">
                        {loading ? 'Sending...' : <><Send size={18} /> Queue Broadcast</>}
                    </button>
                </div>
            </div>
        </div>
    );
}