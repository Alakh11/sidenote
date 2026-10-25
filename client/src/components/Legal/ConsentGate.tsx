import { useEffect, useState } from 'react';
import axios from 'axios';
import { Globe, Smartphone, MessageCircle, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Accounts that haven't agreed to the Terms and Privacy Policy (older accounts, Google sign-ups)
 * must agree before using the dashboard. One agreement covers the website, the app and WhatsApp.
 * Only a clear "no" from the server blocks; on a network error the dashboard opens as usual.
 */
export default function ConsentGate({ onSignOut }: { onSignOut: () => void }) {
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_URL}/auth/consent`)
      .then((res) => { if (!cancelled && res.data?.has_consented === false) setNeeded(true); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (!needed) return null;

  const accept = async () => {
    if (!checked) return setError('Please tick the box to agree before continuing.');
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_URL}/auth/consent`);
      setNeeded(false);
    } catch {
      setError('Could not save your agreement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[#25D366]/15 flex items-center justify-center mb-4"><ShieldCheck className="text-[#25D366]" /></div>
        <h2 id="consent-title" className="text-xl font-extrabold text-slate-900 dark:text-white">Before you continue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          To use SideNote you need to agree to our Terms &amp; Conditions and Privacy Policy. One agreement covers all the ways you use SideNote:
        </p>
        <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2"><Globe size={16} className="text-[#25D366]" /> The website, sidenote.in</li>
          <li className="flex items-center gap-2"><Smartphone size={16} className="text-[#25D366]" /> The SideNote app</li>
          <li className="flex items-center gap-2"><MessageCircle size={16} className="text-[#25D366]" /> SideNote on WhatsApp</li>
        </ul>
        <label className="flex items-start gap-3 mt-5 cursor-pointer">
          <input type="checkbox" className="mt-1 w-4 h-4 accent-[#25D366]" checked={checked} onChange={(e) => { setChecked(e.target.checked); setError(''); }} />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-[#25D366] hover:underline">Terms &amp; Conditions</a> and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-[#25D366] hover:underline">Privacy Policy</a> for the SideNote website, app and WhatsApp.
          </span>
        </label>
        {error && <p className="text-sm font-bold text-rose-600 mt-3">{error}</p>}
        <button onClick={accept} disabled={saving} className="w-full mt-5 py-3 rounded-xl font-bold text-white bg-[#25D366] hover:bg-[#1EA952] disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Agree and continue'}
        </button>
        <button onClick={onSignOut} className="w-full mt-2 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400">Sign out</button>
      </div>
    </div>
  );
}
