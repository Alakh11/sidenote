import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Bug, Star, Send, AlertCircle, CheckCircle, HelpCircle, User as UserIcon, Clock } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';

export default function Feedback() {
  const router = useRouter();
  const { user } = router.options.context as any;
  const API_URL = "https://api.sidenote.in";
  const [viewTab, setViewTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<any[]>([]);

  const [type, setType] = useState<'feedback' | 'review' | 'issue'>('feedback');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({ subject: '', message: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchHistory = async () => {
      try {
          const res = await axios.get(`${API_URL}/support/feedback/history`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
          setHistory(res.data);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
      if (viewTab === 'history') fetchHistory();
  }, [viewTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');

    if (!formData.subject.trim() || !formData.message.trim()) return setError("Subject and Message are required.");
    if (type === 'review' && rating === 0) return setError("Please select a star rating for your review.");

    setLoading(true);
    try {
        await axios.post(`${API_URL}/support/feedback`, {
            type, rating: type === 'review' ? rating : 0, subject: formData.subject, message: formData.message
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        
        setSuccessMsg("Thank you! Your submission has been received.");
        setFormData({ subject: '', message: '' });
        setRating(0);
        fetchHistory();
    } catch (err) {
        setError("Failed to submit. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
      
      {/* Header & Tabs */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
        <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-[#25D366]" /> Support Hub
            </h2>
            <p className="text-stone-500 dark:text-slate-400 mt-1">Submit feedback or check the status of your tickets.</p>
        </div>
        <div className="flex bg-stone-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setViewTab('new')} className={`flex-1 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'new' ? 'bg-white dark:bg-slate-700 text-[#25D366] shadow-sm' : 'text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-white'}`}>New Ticket</button>
            <button onClick={() => setViewTab('history')} className={`flex-1 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'history' ? 'bg-white dark:bg-slate-700 text-[#25D366] shadow-sm' : 'text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-white'}`}>My Tickets</button>
        </div>
      </div>

      {viewTab === 'new' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6 md:p-8 animate-in fade-in">
            <div className="mb-6 flex items-center gap-2 text-sm text-stone-500 bg-stone-50 p-3 rounded-xl dark:bg-slate-800/50 dark:text-slate-400 border border-stone-100 dark:border-slate-700">
                <UserIcon size={16} /> Submitting securely as <span className="font-bold text-stone-700 dark:text-slate-200">{user?.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onClick={() => { setType('feedback'); setError(''); setSuccessMsg(''); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'feedback' ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366] dark:bg-[#25D366]/20' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200'}`}>
                    <MessageSquare size={24} /><span className="font-bold text-sm">General Feedback</span>
                </button>
                <button onClick={() => { setType('review'); setError(''); setSuccessMsg(''); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'review' ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200'}`}>
                    <Star size={24} /><span className="font-bold text-sm">Write a Review</span>
                </button>
                <button onClick={() => { setType('issue'); setError(''); setSuccessMsg(''); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'issue' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200'}`}>
                    <Bug size={24} /><span className="font-bold text-sm">Report an Issue</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {type === 'review' && (
                    <div className="flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-700 animate-in fade-in">
                        <p className="text-sm font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-3">Rate your experience</p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="focus:outline-none transition-transform hover:scale-110">
                                    <Star size={36} className={`transition-colors ${star <= (hoveredRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-slate-600'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Subject</label>
                    <input className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/50" placeholder={type === 'issue' ? "E.g., Transaction not saving" : "What is this regarding?"} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Detailed Message</label>
                    <textarea rows={6} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/50 resize-none" placeholder={type === 'issue' ? "Please describe the steps to reproduce the bug..." : "Tell us what you think..."} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>

                {error && <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertCircle size={16} />{error}</div>}
                {successMsg && <div className="flex items-center gap-2 p-3 bg-[#25D366]/10 text-[#25D366] rounded-xl"><CheckCircle size={16} />{successMsg}</div>}

                <button type="submit" disabled={loading || successMsg !== ''} className="w-full py-4 bg-[#111111] dark:bg-[#25D366] text-white rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                    {loading ? 'Sending...' : successMsg ? 'Submitted' : 'Submit Ticket'} {!loading && !successMsg && <Send size={18} />}
                </button>
            </form>
          </div>
      ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
              {history.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800">
                      <p className="text-stone-500 dark:text-slate-400">You haven't submitted any tickets yet.</p>
                  </div>
              ) : (
                  history.map((t: any) => (
                      <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                          {/* Status Indicator */}
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${t.status === 'resolved' ? 'bg-[#25D366]' : 'bg-amber-400'}`}></div>
                          
                          <div className="pl-3">
                              <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-stone-800 dark:text-white text-lg">{t.subject}</h4>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${t.status === 'resolved' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-amber-100 text-amber-600'}`}>
                                      {t.status === 'resolved' ? 'Resolved' : 'Under Review'}
                                  </span>
                              </div>
                              <p className="text-sm text-stone-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">{t.message}</p>
                              
                              {/* Admin Reply Box */}
                              {t.status === 'resolved' && t.admin_reply && (
                                  <div className="mt-4 p-4 bg-[#25D366]/5 dark:bg-[#25D366]/10 rounded-xl border border-[#25D366]/20 relative">
                                      <span className="absolute -top-2.5 left-4 bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold uppercase px-2 py-0.5 rounded">Admin Reply</span>
                                      <p className="text-sm text-stone-800 dark:text-slate-200 mt-1 whitespace-pre-wrap">{t.admin_reply}</p>
                                  </div>
                              )}
                              
                              <div className="mt-4 flex items-center gap-1 text-xs text-stone-400 font-mono">
                                  <Clock size={12} /> Submitted on {new Date(t.created_at).toLocaleDateString()}
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}
    </div>
  );
}