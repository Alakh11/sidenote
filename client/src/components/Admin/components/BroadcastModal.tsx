import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Send, X, AlertTriangle, MessageSquare, LayoutTemplate, Clock, Image as ImageIcon, FileText, Video, Mic } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

type MessageType = 'template' | 'text' | 'image' | 'document' | 'video' | 'audio';

export default function BroadcastModal({ onClose, selectedUserIds }: { onClose: () => void, selectedUserIds: number[] }) {
    const [messageType, setMessageType] = useState<MessageType>('template');
    
    // Template State
    const [templateName, setTemplateName] = useState('sidenote_welcome_v1');
    const [variables, setVariables] = useState('');
    
    // Text State
    const [messageText, setMessageText] = useState('');
    
    // Media State
    const [mediaLink, setMediaLink] = useState('');
    const [caption, setCaption] = useState('');
    const [filename, setFilename] = useState('');
    
    // Audience & Status State
    const [sendToAll, setSendToAll] = useState(selectedUserIds.length === 0);
    const [audienceFilter, setAudienceFilter] = useState<'all' | 'active_24h'>('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (messageType !== 'template') {
            setAudienceFilter('active_24h');
        }
    }, [messageType]);

    const handleSend = async () => {
        const targetCount = sendToAll ? "ALL verified users" : `${selectedUserIds.length} selected users`;
        if (!confirm(`Blast this ${messageType} to ${targetCount} via WhatsApp?`)) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                message_type: messageType,
                template_name: messageType === 'template' ? templateName : null,
                variables: messageType === 'template' && variables.trim() ? variables.split(',').map(s => s.trim()) : [],
                message_text: messageType === 'text' ? messageText : null,
                media_link: ['image', 'document', 'video', 'audio'].includes(messageType) ? mediaLink : null,
                caption: ['image', 'document', 'video'].includes(messageType) ? caption : null,
                filename: messageType === 'document' ? filename : null,
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

    const formatTypes = [
        { id: 'template', icon: LayoutTemplate, label: 'Template' },
        { id: 'text', icon: MessageSquare, label: 'Free Text' },
        { id: 'image', icon: ImageIcon, label: 'Image' },
        { id: 'document', icon: FileText, label: 'Document' },
        { id: 'video', icon: Video, label: 'Video' },
        { id: 'audio', icon: Mic, label: 'Audio' }
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 border border-stone-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        <Megaphone size={20} className="text-emerald-500"/> Custom Broadcast
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><X size={20}/></button>
                </div>
                
                <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 pb-2">
                    
                    {/* User Target Toggle */}
                    <div className="flex gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl shrink-0">
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

                    {/* Message Format Grid */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl shrink-0">
                        {formatTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = messageType === type.id;
                            return (
                                <button 
                                    key={type.id}
                                    onClick={() => setMessageType(type.id)} 
                                    className={`py-2.5 flex flex-col items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition ${isSelected ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-slate-700'}`}
                                >
                                    <Icon size={16} /> {type.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* 24-Hour Filter Toggle */}
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between transition shrink-0 ${audienceFilter === 'active_24h' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-stone-50 border-stone-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                        <div className="flex items-start gap-2.5">
                            <Clock size={16} className={`mt-0.5 ${audienceFilter === 'active_24h' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`} />
                            <div>
                                <p className={`text-sm font-bold leading-none ${audienceFilter === 'active_24h' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-700 dark:text-slate-300'}`}>Smart 24h Filter</p>
                                <p className={`text-xs mt-1 leading-tight ${audienceFilter === 'active_24h' ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-stone-500'}`}>Only target users active in the last 24 hours.</p>
                            </div>
                        </div>
                        <label className={`relative inline-flex items-center shrink-0 ml-2 ${messageType !== 'template' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={audienceFilter === 'active_24h'} 
                                disabled={messageType !== 'template'}
                                onChange={(e) => setAudienceFilter(e.target.checked ? 'active_24h' : 'all')} 
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    
                    {messageType === 'template' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
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
                                    rows={2}
                                    placeholder="e.g., Variable 1, Variable 2..."
                                    value={variables} 
                                    onChange={e => setVariables(e.target.value)} 
                                />
                            </div>
                        </div>
                    )}

                    {messageType === 'text' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>Free-form texts bypass Meta's template billing, but will <strong>FAIL</strong> if sent to users outside the 24-hour service window.</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Message Body</label>
                                <textarea 
                                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none text-sm" 
                                    rows={4}
                                    placeholder="Type your exact message here..."
                                    value={messageText} 
                                    onChange={e => setMessageText(e.target.value)} 
                                />
                            </div>
                        </div>
                    )}

                    {/* 3. MEDIA FIELDS */}
                    {['image', 'document', 'video', 'audio'].includes(messageType) && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>Media messages bypass Meta's template billing, but will <strong>FAIL</strong> if sent to users outside the 24-hour service window.</span>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Media URL (Public Link)</label>
                                <input 
                                    type="url"
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm" 
                                    placeholder={`https://example.com/file.${messageType === 'document' ? 'pdf' : messageType === 'image' ? 'jpg' : 'mp4'}`}
                                    value={mediaLink} 
                                    onChange={e => setMediaLink(e.target.value)} 
                                />
                            </div>

                            {['image', 'document', 'video'].includes(messageType) && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Caption (Optional)</label>
                                    <input 
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm" 
                                        placeholder="Add a message..."
                                        value={caption} 
                                        onChange={e => setCaption(e.target.value)} 
                                    />
                                </div>
                            )}

                            {messageType === 'document' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Custom Filename (Optional)</label>
                                    <input 
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm font-mono" 
                                        placeholder="e.g., Monthly_Report.pdf"
                                        value={filename} 
                                        onChange={e => setFilename(e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex gap-3 mt-4 shrink-0 pt-4 border-t border-stone-100 dark:border-slate-800">
                    <button onClick={onClose} className="flex-1 py-3.5 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50" disabled={loading}>Cancel</button>
                    
                    <button onClick={handleSend} disabled={loading} className="flex-1 py-3.5 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50">
                        {loading ? <span className="animate-pulse">Queuing...</span> : <><Send size={18} /> Queue Broadcast</>}
                    </button>
                </div>
            </div>
        </div>
    );
}