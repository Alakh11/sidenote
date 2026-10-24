import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Sparkles, Upload, RefreshCw, X, Image as ImageIcon, FileText, Trash2, Eye, MousePointerClick, Pencil, Power, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Keep in sync with PopupStyle / PopupPayload in server/routers/popups.py
interface PopupStyle {
  title_color: string;
  body_color: string;
  background_color: string;
  accent_color: string;
  title_size: number;
  body_size: number;
  align: 'left' | 'center' | 'right';
  title_bold: boolean;
  title_italic: boolean;
  body_bold: boolean;
  body_italic: boolean;
  body_underline: boolean;
}

interface Popup {
  id?: number;
  title: string;
  body: string;
  style: PopupStyle;
  media_type: 'none' | 'image' | 'document';
  media_url: string;
  media_name: string;
  cta_label: string;
  cta_url: string;
  user_ids: number[];
  starts_at: string;
  ends_at: string;
  show_once: boolean;
  is_active: boolean;
  views?: number;
  clicks?: number;
}

const DEFAULT_STYLE: PopupStyle = {
  title_color: '#111111', body_color: '#4B5563', background_color: '#FFFFFF', accent_color: '#25D366',
  title_size: 24, body_size: 15, align: 'center', title_bold: true, title_italic: false, body_bold: false, body_italic: false, body_underline: false,
};

const EMPTY: Popup = {
  title: '', body: '', style: DEFAULT_STYLE, media_type: 'none', media_url: '', media_name: '', cta_label: '', cta_url: '',
  user_ids: [], starts_at: '', ends_at: '', show_once: true, is_active: true,
};

// Ready-made looks for common occasions; everything stays editable
const PRESETS: { label: string; style: Partial<PopupStyle> }[] = [
  { label: 'Clean', style: DEFAULT_STYLE },
  { label: 'Festive', style: { background_color: '#FFF7E6', title_color: '#C2410C', body_color: '#7C2D12', accent_color: '#EA580C' } },
  { label: 'Midnight', style: { background_color: '#0F172A', title_color: '#F8FAFC', body_color: '#CBD5E1', accent_color: '#25D366' } },
  { label: 'Offer', style: { background_color: '#F3E8FF', title_color: '#6B21A8', body_color: '#581C87', accent_color: '#9333EA' } },
];

/** *bold*, _italic_, ~strike~ inside the body, same as the app's chat formatting */
function RichBody({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <strong key={i}>{p.slice(1, -1)}</strong>;
        if (p.length > 2 && p.startsWith('_') && p.endsWith('_')) return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.length > 2 && p.startsWith('~') && p.endsWith('~')) return <s key={i}>{p.slice(1, -1)}</s>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Toggle({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title: string }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`p-2 rounded-lg border-2 transition-colors ${on ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-stone-200 dark:border-slate-700 text-stone-500 dark:text-slate-400'}`}>
      {children}
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-slate-400">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="w-8 h-8 rounded-lg border border-stone-200 dark:border-slate-700 cursor-pointer bg-transparent" />
      {label}
    </label>
  );
}

const inputClass = 'w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 mt-1 outline-none focus:border-indigo-500 dark:text-white text-sm';
const labelClass = 'text-sm font-bold text-stone-500 dark:text-slate-400';

/** What the user sees in the app */
function PopupPreview({ popup }: { popup: Popup }) {
  const s = popup.style;
  return (
    <div className="rounded-[2rem] bg-stone-900/60 p-4 flex items-center justify-center min-h-[420px]">
      <div className="w-full max-w-[300px] rounded-[1.75rem] overflow-hidden shadow-2xl" style={{ backgroundColor: s.background_color, textAlign: s.align }}>
        {popup.media_type === 'image' && popup.media_url && <img src={popup.media_url} alt="" className="w-full aspect-[16/10] object-cover" />}
        <div className="p-5 space-y-3">
          <p style={{ color: s.title_color, fontSize: s.title_size, fontWeight: s.title_bold ? 800 : 500, fontStyle: s.title_italic ? 'italic' : 'normal', lineHeight: 1.15 }}>
            {popup.title || 'Your header'}
          </p>
          <p style={{ color: s.body_color, fontSize: s.body_size, fontWeight: s.body_bold ? 700 : 400, fontStyle: s.body_italic ? 'italic' : 'normal', textDecoration: s.body_underline ? 'underline' : 'none', whiteSpace: 'pre-wrap' }}>
            <RichBody text={popup.body || 'Your message. Use *bold*, _italic_ or ~strike~.'} />
          </p>
          {popup.media_type === 'document' && popup.media_url && (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold" style={{ borderColor: s.accent_color, color: s.accent_color, justifyContent: s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start' }}>
              <FileText size={16} /> {popup.media_name || 'Open document'}
            </div>
          )}
          {popup.cta_label && (
            <div className="rounded-full py-3 text-center text-sm font-black text-white" style={{ backgroundColor: s.accent_color }}>{popup.cta_label}</div>
          )}
          <p className="text-center text-xs font-bold opacity-60" style={{ color: s.body_color }}>Close</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPopups() {
  const [form, setForm] = useState<Popup>(EMPTY);
  const [userIds, setUserIds] = useState('');
  const [list, setList] = useState<Popup[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(`${API_URL}/admin/popups`);
      setList(res.data);
    } catch (e) {
      console.error('Failed to load popups', e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { void fetchList(); }, [fetchList]);

  const set = <K extends keyof Popup>(key: K, value: Popup[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setStyle = <K extends keyof PopupStyle>(key: K, value: PopupStyle[K]) => setForm((f) => ({ ...f, style: { ...f.style, [key]: value } }));

  const upload = async (file: File) => {
    const isPdf = file.type === 'application/pdf';
    if (file.size > (isPdf ? 5 : 1) * 1024 * 1024) return alert(isPdf ? 'PDFs must be 5 MB or smaller.' : 'Images must be 1 MB or smaller.');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await axios.post(`${API_URL}/admin/notifications/media`, data);
      setForm((f) => ({ ...f, media_type: isPdf ? 'document' : 'image', media_url: res.data.url, media_name: isPdf ? file.name : f.media_name }));
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const edit = (p: Popup) => {
    setForm({ ...EMPTY, ...p, body: p.body || '', media_url: p.media_url || '', media_name: p.media_name || '', cta_label: p.cta_label || '', cta_url: p.cta_url || '', starts_at: p.starts_at?.slice(0, 16) || '', ends_at: p.ends_at?.slice(0, 16) || '' });
    setUserIds((p.user_ids || []).join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (!form.title.trim()) return alert('Add a header.');
    const ids = userIds.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
    const payload = {
      ...form,
      user_ids: ids,
      media_url: form.media_type === 'none' ? null : form.media_url || null,
      media_name: form.media_name || null,
      cta_label: form.cta_label || null,
      cta_url: form.cta_url || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    setSaving(true);
    try {
      if (form.id) await axios.put(`${API_URL}/admin/popups/${form.id}`, payload);
      else await axios.post(`${API_URL}/admin/popups`, payload);
      setForm(EMPTY);
      setUserIds('');
      void fetchList();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      alert(Array.isArray(detail) ? detail.map((d: any) => d.msg).join('\n') : detail || 'Could not save the popup');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Popup) => {
    try {
      await axios.put(`${API_URL}/admin/popups/${p.id}`, { ...p, is_active: !p.is_active, starts_at: p.starts_at || null, ends_at: p.ends_at || null });
      void fetchList();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Could not update the popup');
    }
  };

  const remove = async (p: Popup) => {
    if (!confirm(`Delete "${p.title}"? Its view stats are deleted too.`)) return;
    await axios.delete(`${API_URL}/admin/popups/${p.id}`).catch(() => alert('Could not delete'));
    void fetchList();
  };

  const s = form.style;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white"><Sparkles className="text-indigo-500" size={24} /> {form.id ? 'Edit Popup' : 'New In-App Popup'}</h3>
            {form.id && <button onClick={() => { setForm(EMPTY); setUserIds(''); }} className="text-sm font-bold text-stone-500 flex items-center gap-1"><X size={14} /> Cancel edit</button>}
          </div>

          <div>
            <span className={labelClass}>Look</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => setForm((f) => ({ ...f, style: { ...f.style, ...p.style } }))} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-stone-200 dark:border-slate-700 dark:text-slate-300 hover:border-indigo-400">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Header</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={160} placeholder="Happy Diwali! 🪔" className={inputClass} />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <ColorField label="Colour" value={s.title_color} onChange={(v) => setStyle('title_color', v)} />
              <Toggle title="Bold" on={s.title_bold} onClick={() => setStyle('title_bold', !s.title_bold)}><Bold size={14} /></Toggle>
              <Toggle title="Italic" on={s.title_italic} onClick={() => setStyle('title_italic', !s.title_italic)}><Italic size={14} /></Toggle>
              <label className="text-xs font-bold text-stone-500 dark:text-slate-400 flex items-center gap-2">Size
                <input type="range" min={14} max={40} value={s.title_size} onChange={(e) => setStyle('title_size', Number(e.target.value))} />{s.title_size}
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Body <span className="font-medium text-stone-400">(*bold* _italic_ ~strike~)</span></label>
            <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={4} maxLength={2000} placeholder="Wishing you and your family a bright and prosperous Diwali." className={`${inputClass} resize-none`} />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <ColorField label="Colour" value={s.body_color} onChange={(v) => setStyle('body_color', v)} />
              <Toggle title="Bold" on={s.body_bold} onClick={() => setStyle('body_bold', !s.body_bold)}><Bold size={14} /></Toggle>
              <Toggle title="Italic" on={s.body_italic} onClick={() => setStyle('body_italic', !s.body_italic)}><Italic size={14} /></Toggle>
              <Toggle title="Underline" on={s.body_underline} onClick={() => setStyle('body_underline', !s.body_underline)}><Underline size={14} /></Toggle>
              <label className="text-xs font-bold text-stone-500 dark:text-slate-400 flex items-center gap-2">Size
                <input type="range" min={11} max={24} value={s.body_size} onChange={(e) => setStyle('body_size', Number(e.target.value))} />{s.body_size}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ColorField label="Background" value={s.background_color} onChange={(v) => setStyle('background_color', v)} />
            <ColorField label="Button" value={s.accent_color} onChange={(v) => setStyle('accent_color', v)} />
            <div className="flex gap-1">
              <Toggle title="Align left" on={s.align === 'left'} onClick={() => setStyle('align', 'left')}><AlignLeft size={14} /></Toggle>
              <Toggle title="Centre" on={s.align === 'center'} onClick={() => setStyle('align', 'center')}><AlignCenter size={14} /></Toggle>
              <Toggle title="Align right" on={s.align === 'right'} onClick={() => setStyle('align', 'right')}><AlignRight size={14} /></Toggle>
            </div>
          </div>

          <div>
            <span className={labelClass}>Image or document <span className="font-medium text-stone-400">(optional)</span></span>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />} Upload image / PDF
              </button>
              {form.media_type !== 'none' && (
                <span className="text-xs font-bold text-stone-500 dark:text-slate-400 flex items-center gap-1">
                  {form.media_type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />} {form.media_type === 'image' ? 'Image added' : form.media_name || 'Document added'}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, media_type: 'none', media_url: '', media_name: '' }))} className="ml-1 text-rose-500"><X size={14} /></button>
                </span>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
            {form.media_type === 'document' && (
              <input value={form.media_name} onChange={(e) => set('media_name', e.target.value)} maxLength={200} placeholder="Document label, e.g. Festive offer details" className={inputClass} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Button label</label>
              <input value={form.cta_label} onChange={(e) => set('cta_label', e.target.value)} maxLength={60} placeholder="Claim offer" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Button link</label>
              <input value={form.cta_url} onChange={(e) => set('cta_url', e.target.value)} placeholder="https://sidenote.in/..." className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Audience</label>
            <input value={userIds} onChange={(e) => setUserIds(e.target.value)} placeholder="Everyone (or user IDs: 12, 45, 89)" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Starts</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ends</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-bold text-stone-600 dark:text-slate-300">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.show_once} onChange={(e) => set('show_once', e.target.checked)} /> Show once per user</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active</label>
          </div>

          <button onClick={save} disabled={saving} className="w-full bg-[#111111] dark:bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-indigo-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Publish Popup'}
          </button>
        </div>

        <div className="lg:sticky lg:top-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">App preview</p>
          <PopupPreview popup={form} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold dark:text-white">Popups</h3>
          <button onClick={() => void fetchList()} disabled={loadingList} className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-bold text-sm flex items-center gap-1.5">
            <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-slate-800">
          {list.map((p) => (
            <div key={p.id} className="py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0 border border-stone-200 dark:border-slate-700" style={{ backgroundColor: p.style?.background_color }} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-800 dark:text-white truncate">{p.title}</p>
                <p className="text-xs text-stone-400 flex items-center gap-3">
                  <span className={p.is_active ? 'text-emerald-500' : ''}>{p.is_active ? 'Active' : 'Off'}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {p.views ?? 0}</span>
                  <span className="flex items-center gap-1"><MousePointerClick size={12} /> {p.clicks ?? 0}</span>
                  <span>{p.user_ids?.length ? `${p.user_ids.length} users` : 'Everyone'}</span>
                </p>
              </div>
              <button title={p.is_active ? 'Turn off' : 'Turn on'} onClick={() => toggleActive(p)} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"><Power size={16} /></button>
              <button title="Edit" onClick={() => edit(p)} className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"><Pencil size={16} /></button>
              <button title="Delete" onClick={() => remove(p)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={16} /></button>
            </div>
          ))}
          {list.length === 0 && <p className="py-6 text-center text-stone-400 italic">No popups yet.</p>}
        </div>
      </div>
    </div>
  );
}
