import { useState } from 'react';
import axios from 'axios';
import { Megaphone, Send, X, AlertTriangle } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

export default function BroadcastModal({ onClose, selectedUserIds }: { onClose: () => void, selectedUserIds: number[] }) {
    const [templateName, setTemplateName] = useState('sidenote_custom_alert');
    const [customMessage, setCustomMessage] = useState('');
    const [sendToAll, setSendToAll] = useState(selectedUserIds.length === 0);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        
        const targetCount = sendToAll ? "ALL verified users" : `${selectedUserIds.length} selected users`;
        if (!confirm(`Blast this message to ${targetCount} via WhatsApp?`)) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                template_name: templateName,
                variables: customMessage.trim() ? [customMessage] : [],
                target_user_ids: sendToAll ? [] : selectedUserIds
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

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-stone-400 ml-1">Template Name (Meta API)</label>
                        <input 
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition font-mono text-sm" 
                            value={templateName} 
                            onChange={e => setTemplateName(e.target.value)} 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-stone-400 ml-1 flex items-center gap-1"><AlertTriangle size={12}/> Custom Message Content (Optional)</label>
                        <textarea 
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none" 
                            rows={5}
                            placeholder="Type your custom announcement here if your template requires variables..."
                            value={customMessage} 
                            onChange={e => setCustomMessage(e.target.value)} 
                        />
                    </div>
                </div>
                
                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3.5 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50" disabled={loading}>Cancel</button>
                    
                    <button onClick={handleSend} disabled={loading} className="flex-1 py-3.5 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50">
                        {loading ? 'Sending...' : <><Send size={18} /> Blast Message</>}
                    </button>
                </div>
            </div>
        </div>
    );
}