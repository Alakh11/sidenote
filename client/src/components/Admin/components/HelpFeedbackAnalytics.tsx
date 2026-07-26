import { useState, useEffect } from 'react';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, User as UserIcon, Globe, Calendar, AlertCircle, BarChart2 } from 'lucide-react';

interface FeedbackResponse {
  id: number;
  is_helpful: number;
  ip_address: string;
  date_updated: string;
  user_id: number | null;
  user_name: string | null;
  topic_title: string;
  article_title: string;
}

export default function HelpFeedbackAnalytics() {
  const [feedback, setFeedback] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await axios.get(`${API_URL}/help/admin/feedback`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFeedback(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load feedback data.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString.replace(' ', 'T'));
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8 text-center text-stone-500 font-bold">Loading Analytics...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/50">
        <h3 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="text-[#25D366] w-5 h-5" /> Help Center Responses
        </h3>
        <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
          Review article feedback and user sentiment.
        </p>
      </div>

      {error ? (
        <div className="p-6 text-center text-rose-500 font-bold flex flex-col items-center gap-2">
          <AlertCircle size={24} /> {error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-5 whitespace-nowrap">Article / Topic</th>
                <th className="p-5 whitespace-nowrap">User</th>
                <th className="p-5 whitespace-nowrap">IP Address</th>
                <th className="p-5 whitespace-nowrap">Response</th>
                <th className="p-5 whitespace-nowrap text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {feedback.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-stone-500 font-bold">No feedback collected yet.</td></tr>
              ) : (
                feedback.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                    
                    {/* Article & Topic Info */}
                    <td className="p-5">
                      <p className="font-bold text-sm text-stone-800 dark:text-slate-200 line-clamp-1">{item.article_title}</p>
                      <p className="text-xs text-stone-400 line-clamp-1">{item.topic_title}</p>
                    </td>

                    <td className="p-5">
                      {item.user_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <UserIcon size={12} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-stone-800 dark:text-slate-200">{item.user_name}</p>
                            <p className="text-[10px] text-stone-400">ID: {item.user_id}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-stone-500">
                            <Globe size={12} />
                          </div>
                          <span className="text-sm font-bold text-stone-500 italic">Guest</span>
                        </div>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="p-5">
                      <p className="text-xs font-mono text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                        {item.ip_address || 'Unknown'}
                      </p>
                    </td>

                    {/* Response (Thumbs Up/Down) */}
                    <td className="p-5">
                      {item.is_helpful ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                          <ThumbsUp size={14} /> Helpful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2.5 py-1 rounded-lg">
                          <ThumbsDown size={14} /> Not Helpful
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-5 text-right text-sm text-stone-500 dark:text-slate-400">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar size={14} className="text-stone-400" />
                        {formatDate(item.date_updated)}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}