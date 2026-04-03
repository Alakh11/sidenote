import { useState } from 'react';
import axios from 'axios';
import { MessageSquare, Bug, Star, Send, AlertCircle, CheckCircle, HelpCircle, User as UserIcon } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';

export default function Feedback() {
  const router = useRouter();
  const { user } = router.options.context as any;
  const API_URL = "https://api.sidenote.in";
  
  const [type, setType] = useState<'feedback' | 'review' | 'issue'>('feedback');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({ subject: '', message: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.subject.trim() || !formData.message.trim()) {
        setError("Subject and Message are required.");
        return;
    }
    if (type === 'review' && rating === 0) {
        setError("Please select a star rating for your review.");
        return;
    }

    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/support/feedback`, {
            type, 
            rating: type === 'review' ? rating : 0, 
            subject: formData.subject,
            message: formData.message
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        setSuccessMsg("Thank you! Your submission has been received.");
        setFormData({ subject: '', message: '' });
        setRating(0);
    } catch (err) {
        setError("Failed to submit. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-[#25D366]" /> Support & Feedback
        </h2>
        <p className="text-stone-500 dark:text-slate-400 mt-1">Help us improve SideNote by sharing your thoughts or reporting issues.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm p-6 md:p-8">
        
        <div className="mb-6 flex items-center gap-2 text-sm text-stone-500 bg-stone-50 p-3 rounded-xl dark:bg-slate-800/50 dark:text-slate-400 border border-stone-100 dark:border-slate-700">
            <UserIcon size={16} /> Submitting securely as <span className="font-bold text-stone-700 dark:text-slate-200">{user?.name}</span>
        </div>

        {/* Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button 
                onClick={() => { setType('feedback'); setError(''); setSuccessMsg(''); }}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'feedback' ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366] dark:bg-[#25D366]/20' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200 dark:hover:border-slate-700'}`}
            >
                <MessageSquare size={24} />
                <span className="font-bold text-sm">General Feedback</span>
            </button>
            <button 
                onClick={() => { setType('review'); setError(''); setSuccessMsg(''); }}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'review' ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:border-amber-500' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200 dark:hover:border-slate-700'}`}
            >
                <Star size={24} />
                <span className="font-bold text-sm">Write a Review</span>
            </button>
            <button 
                onClick={() => { setType('issue'); setError(''); setSuccessMsg(''); }}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'issue' ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:border-rose-500' : 'border-stone-100 dark:border-slate-800 text-stone-500 hover:border-stone-200 dark:hover:border-slate-700'}`}
            >
                <Bug size={24} />
                <span className="font-bold text-sm">Report an Issue</span>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
            
            {/* Star Rating (Only visible if type is 'review') */}
            {type === 'review' && (
                <div className="flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-3">Rate your experience</p>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star} type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star 
                                    size={36} 
                                    className={`transition-colors ${star <= (hoveredRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-slate-600'}`} 
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Subject</label>
                <input 
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/50 transition" 
                    placeholder={type === 'issue' ? "E.g., Transaction not saving" : "What is this regarding?"}
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})} 
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-stone-400 ml-1">Detailed Message</label>
                <textarea 
                    rows={6}
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#25D366]/50 transition resize-none" 
                    placeholder={type === 'issue' ? "Please describe the steps to reproduce the bug..." : "Tell us what you think..."}
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                />
            </div>

            {error && <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 text-sm font-bold rounded-xl"><AlertCircle size={16} />{error}</div>}
            {successMsg && <div className="flex items-center gap-2 p-3 bg-[#25D366]/10 text-[#25D366] dark:bg-[#25D366]/20 text-sm font-bold rounded-xl"><CheckCircle size={16} />{successMsg}</div>}

            <button 
                type="submit" 
                disabled={loading || successMsg !== ''}
                className="w-full py-4 bg-[#111111] dark:bg-[#25D366] text-white rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition-colors flex justify-center items-center gap-2 shadow-lg disabled:opacity-70"
            >
                {loading ? 'Sending...' : successMsg ? 'Submitted' : 'Submit'} 
                {!loading && !successMsg && <Send size={18} />}
            </button>
        </form>

      </div>
    </div>
  );
}