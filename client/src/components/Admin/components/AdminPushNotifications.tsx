import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, Bell, CheckCircle2, Users, RefreshCw, Image as ImageIcon, Upload, X, Play, Volume2, VolumeX,
  AlertTriangle, Clock, Gift, Sparkles,
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

type NotificationType = 'general' | 'alert' | 'reminder' | 'offer' | 'update';
type SoundKey = 'default' | 'chime' | 'coin' | 'pop' | 'silent';

// Keep in sync with NOTIFICATION_TYPES / SOUNDS in server/routers/notifications.py and the app's channels
const TYPES: { value: NotificationType; label: string; icon: typeof Bell; color: string }[] = [
  { value: 'general', label: 'General', icon: Bell, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { value: 'alert', label: 'Alert', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  { value: 'reminder', label: 'Reminder', icon: Clock, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  { value: 'offer', label: 'Offer', icon: Gift, color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' },
  { value: 'update', label: 'Update', icon: Sparkles, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
];

const SOUNDS: { value: SoundKey; label: string; file?: string }[] = [
  { value: 'default', label: 'Phone default' },
  { value: 'chime', label: 'Chime', file: '/notification-sounds/sidenote_chime.wav' },
  { value: 'coin', label: 'Coin', file: '/notification-sounds/sidenote_coin.wav' },
  { value: 'pop', label: 'Pop', file: '/notification-sounds/sidenote_pop.wav' },
  { value: 'silent', label: 'Silent' },
];

const typeMeta = (value?: string) => TYPES.find((t) => t.value === value) ?? TYPES[0];

interface Stat {
  title: string;
  body: string;
  type?: NotificationType;
  sound?: SoundKey;
  image_url?: string | null;
  icon_url?: string | null;
  last_sent?: string;
  total_sent: number;
  total_read: number;
}

/** Image field: paste an https link or upload a file (stored by the API, max 1 MB) */
function ImageInput({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (file.size > 1024 * 1024) return alert('Image must be 1 MB or smaller.');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(`${API_URL}/admin/notifications/media`, form);
      if (!res.data.https) alert('Uploaded, but the link is not https, so phones may not show it. Set PUBLIC_API_URL on the server.');
      onChange(res.data.url);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="text-sm font-bold text-stone-500 dark:text-slate-400">{label} <span className="font-medium text-stone-400">(optional)</span></label>
      <div className="flex gap-2 mt-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 min-w-0 p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none focus:border-indigo-500 dark:text-white text-sm"
        />
        {value && (
          <button type="button" onClick={() => onChange('')} title="Remove" className="px-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-500 hover:bg-stone-200">
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-1.5 hover:bg-indigo-100 disabled:opacity-50"
        >
          {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />} Upload
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <p className="text-xs text-stone-400 mt-1">{hint}</p>
    </div>
  );
}

export default function AdminPushNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<NotificationType>('general');
  const [sound, setSound] = useState<SoundKey>('default');
  const [imageUrl, setImageUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [userIds, setUserIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/notifications/stats`);
      setStats(res.data);
      setStatsUpdatedAt(new Date());
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const previewSound = (key: SoundKey) => {
    const file = SOUNDS.find((s) => s.value === key)?.file;
    if (file) void new Audio(file).play().catch(() => undefined);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return alert("Title and Body are required");
    for (const [name, url] of [['Image', imageUrl], ['Logo', iconUrl]] as const) {
      if (url && !url.startsWith('https://')) return alert(`${name} must be an https:// link`);
    }

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
        title: title.trim(),
        body: body.trim(),
        type,
        sound,
        image_url: imageUrl || null,
        icon_url: iconUrl || null,
      });
      alert(`Sent successfully!\nDelivered: ${res.data.success_count}\nFailed: ${res.data.failure_count}${res.data.removed_tokens ? `\nRemoved dead devices: ${res.data.removed_tokens}` : ''}`);
      setTitle('');
      setBody('');
      setImageUrl('');
      setIconUrl('');
      void fetchStats();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      alert(Array.isArray(detail) ? detail.map((d: any) => d.msg).join('\n') : detail || "Failed to send notifications");
    } finally {
      setLoading(false);
    }
  };

  const meta = typeMeta(type);
  const TypeIcon = meta.icon;

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
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Notification Type</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border-2 transition-colors ${type === value ? `${color} border-current` : 'border-transparent bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Header</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Promo, Alert, Update..." maxLength={65} className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 dark:text-white" />
          </div>

          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={1000} placeholder="Type the notification content..." className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 resize-none dark:text-white" />
          </div>

          <ImageInput label="Image" hint="Large picture shown in the push and the app inbox. PNG, JPG or WEBP up to 1 MB, ideally 2:1." value={imageUrl} onChange={setImageUrl} />
          <ImageInput label="Logo" hint="Small square logo shown beside the notification in the app inbox." value={iconUrl} onChange={setIconUrl} />

          <div>
            <label className="text-sm font-bold text-stone-500 dark:text-slate-400">Sound</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SOUNDS.map(({ value, label, file }) => (
                <button
                  key={value}
                  onClick={() => { setSound(value); previewSound(value); }}
                  className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors ${sound === value ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  {value === 'silent' ? <VolumeX size={15} /> : file ? <Play size={14} /> : <Volume2 size={15} />} {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-1">Click a sound to hear it. Custom sounds need the latest app build on the phone.</p>
          </div>

          {/* Preview of the inbox card as it will look in the app */}
          {(title || body || imageUrl) && (
            <div className="rounded-2xl border border-stone-100 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">App preview</p>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 flex gap-3 border border-emerald-400/60">
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}><TypeIcon size={18} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <span className={`inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${meta.color}`}>{meta.label}</span>
                  <p className="font-black text-sm text-stone-900 dark:text-white mt-1 truncate">{title || 'Header'}</p>
                  <p className="text-xs text-stone-500 dark:text-slate-400 line-clamp-2">{body || 'Body'}</p>
                  {imageUrl && <img src={imageUrl} alt="" className="mt-2 w-full aspect-[2/1] object-cover rounded-xl" />}
                </div>
              </div>
            </div>
          )}

          <button onClick={handleSend} disabled={loading} className="w-full bg-[#111111] dark:bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
             {loading ? 'Dispatching...' : 'Send Push Notification'} <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Analytics & Stats Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[700px] lg:sticky lg:top-6">
        <div className="flex items-center justify-between gap-3 mb-6 shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <Users className="text-emerald-500" size={24} /> Delivery & Read Stats
            </h3>
            {statsUpdatedAt && <p className="text-xs text-stone-400 mt-1">Updated {statsUpdatedAt.toLocaleTimeString()}</p>}
          </div>
          <button
            onClick={() => void fetchStats()}
            disabled={statsLoading}
            title="Refresh stats"
            className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold text-sm flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCw size={15} className={statsLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="overflow-y-auto no-scrollbar flex-1 border border-stone-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold sticky top-0">
              <tr>
                <th className="p-4">Campaign</th>
                <th className="p-4 text-center">Sent</th>
                <th className="p-4 text-center">Read</th>
                <th className="p-4 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {stats.map((stat, i) => {
                const readRate = stat.total_sent > 0 ? Math.round((stat.total_read / stat.total_sent) * 100) : 0;
                const m = typeMeta(stat.type);
                return (
                  <tr key={i} className="hover:bg-stone-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {stat.image_url || stat.icon_url ? (
                          <img src={(stat.icon_url || stat.image_url) as string} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-stone-400"><ImageIcon size={15} /></div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${m.color}`}>{m.label}</span>
                            {stat.sound && stat.sound !== 'default' && <span className="text-[9px] font-bold uppercase text-stone-400">{stat.sound}</span>}
                          </div>
                          <p className="font-bold text-stone-800 dark:text-white truncate max-w-[200px]">{stat.title}</p>
                          <p className="text-xs text-stone-400 truncate max-w-[200px]">{stat.body}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-sm">{stat.total_sent}</td>
                    <td className="p-4 text-center font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      <span className="inline-flex items-center gap-1">{stat.total_read} <CheckCircle2 size={14} /></span>
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
