import { useState, useEffect, useCallback } from 'react';
import { Send, Bell, CheckCircle2, Users } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminPushNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [userIds, setUserIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/notifications/stats`);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleSend = async () => {
    if (!title || !body) return alert("Title and Body are required");
    
    let parsedIds: number[] = [];
    if (targetType === 'specific') {
      parsedIds = userIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (parsedIds.length === 0) return alert("Enter valid user IDs");
    }

    if (!confirm(`Send to ${targetType === 'all' ? 'EVERYONE' : `${parsedIds.length} users`}?`)) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/notifications/send`, {
        user_ids: parsedIds,
        title,
        body
      });
      alert(`Sent successfully!\nDelivered: ${res.data.success_count}\nFailed: ${res.data.failure_count}`);
      setTitle('');
      setBody('');
      void fetchStats();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to send notifications");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Send Notification Form */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6 dark:text-white">
          <Send className="text-indigo-500" size={24} /> Compose Push Notification
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Target Audience</label>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setTargetType('all')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${targetType === 'all' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-400'}`}>Broadcast All</button>
              <button onClick={() => setTargetType('specific')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${targetType === 'specific' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-400'}`}>Specific Users</button>
            </div>
          </div>

          {targetType === 'specific' && (
            <div>
              <label className="text-sm font-bold text-stone-500 dark:text-slate-400">User IDs (comma separated)</label>
              <input value={userIds} onChange={e => setUserIds(e.target.value)} placeholder="e.g. 12, 45, 89" className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 dark:text-white" />
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Notification Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Promo, Alert, Update..." maxLength={65} className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 dark:text-white" />
          </div>

          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Message Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Type the notification content..." className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 resize-none dark:text-white" />
          </div>

          <button onClick={handleSend} disabled={loading} className="w-full bg-[#111111] dark:bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
             {loading ? 'Dispatching...' : 'Send Push Notification'} <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Analytics & Stats Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[500px]">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6 dark:text-white shrink-0">
          <Users className="text-emerald-500" size={24} /> Delivery & Read Stats
        </h3>
        
        <div className="overflow-y-auto no-scrollbar flex-1 border border-stone-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold sticky top-0">
              <tr>
                <th className="p-4">Campaign Title</th>
                <th className="p-4 text-center">Sent</th>
                <th className="p-4 text-center">Read</th>
                <th className="p-4 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {stats.map((stat, i) => {
                const readRate = stat.total_sent > 0 ? Math.round((stat.total_read / stat.total_sent) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-stone-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <p className="font-bold text-stone-800 dark:text-white truncate max-w-[200px]">{stat.title}</p>
                      <p className="text-xs text-stone-400 truncate max-w-[200px]">{stat.body}</p>
                    </td>
                    <td className="p-4 text-center font-mono text-sm">{stat.total_sent}</td>
                    <td className="p-4 text-center font-mono text-sm text-emerald-600 dark:text-emerald-400 flex justify-center items-center gap-1">
                      {stat.total_read} <CheckCircle2 size={14} />
                    </td>
                    <td className="p-4 text-center text-sm font-bold">
                      <span className={readRate > 50 ? 'text-emerald-500' : 'text-amber-500'}>{readRate}%</span>
                    </td>
                  </tr>
                )
              })}
              {stats.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-stone-400 italic">No notifications sent yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}