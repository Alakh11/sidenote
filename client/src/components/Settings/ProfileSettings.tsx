import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { User, Lock, Save, Camera, CheckCircle2, AlertCircle, IndianRupee, Mail, Phone } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

const AVATARS = ['😎', '👻', '🤖', '🐯', '👽', '🐶', '👑', '💼', '🧢', '🦄', '🦉', '👨‍💻'];

const COUNTRY_CODES = [
    { code: '91', label: '+91 (IN)', len: 10 },
    { code: '1', label: '+1 (US/CA)', len: 10 },
    { code: '44', label: '+44 (UK)', len: 10 },
    { code: '61', label: '+61 (AU)', len: 9 },
    { code: '971', label: '+971 (AE)', len: 9 },
    { code: '65', label: '+65 (SG)', len: 8 },
    { code: '27', label: '+27 (ZA)', len: 9 },
];

export default function ProfileSettings() {
  const router = useRouter();
  const user = router.options.context?.user as any;
  const [prefData, setPrefData] = useState({ 
    currency: user?.currency || '₹', 
    month_start_date: user?.month_start_date || 1 
  });
  
  const CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
    { code: "RUB", symbol: "₽", name: "Russian Ruble" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  ];
  
  const [profileData, setProfileData] = useState({ 
      name: user?.name || '', 
      profile_pic: user?.picture || '😎',
      email: user?.email || '',
      mobile: user?.mobile || ''
  });
  const [countryCode, setCountryCode] = useState('91');
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const hasMobileLocked = !!user?.mobile;

  useEffect(() => {
      if (user) {
          setProfileData({
              name: user.name || '',
              profile_pic: user.picture || '😎',
              email: user.email || '',
              mobile: user.mobile || ''
          });
      }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMsg(null);
      
      let finalMobile = profileData.mobile;
      if (!hasMobileLocked && finalMobile) {
          finalMobile = `${countryCode}${finalMobile.replace(/\D/g, '')}`;
      }

      try {
          await axios.put(`${API_URL}/auth/profile`, {
              name: profileData.name,
              profile_pic: profileData.profile_pic,
              email: profileData.email || null,
              mobile: finalMobile || null
          });
          
          const updatedUser = { 
              ...user, 
              name: profileData.name, 
              picture: profileData.profile_pic,
              email: profileData.email,
              mobile: finalMobile
          };
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          setMsg({ type: 'success', text: 'Profile updated!' });
          setTimeout(() => window.location.reload(), 1000); 
      } catch(e: any) {
          setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to update profile.' });
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);

      if (passData.new !== passData.confirm) {
          setMsg({ type: 'error', text: 'New passwords do not match.' });
          return;
      }
      if (passData.new.length < 6) {
          setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
          return;
      }

      setLoading(true);
      try {
          await axios.put(`${API_URL}/auth/password`, {
              old_password: passData.old,
              new_password: passData.new
          });
          setMsg({ type: 'success', text: 'Password changed successfully!' });
          setPassData({ old: '', new: '', confirm: '' });
      } catch(e: any) {
          setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to change password' });
      } finally {
          setLoading(false);
      }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMsg(null);
      try {
          await axios.put(`${API_URL}/auth/preferences`, prefData);
          
          const updatedUser = { ...user, ...prefData };
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          setMsg({ type: 'success', text: 'Financial preferences updated!' });
          setTimeout(() => window.location.reload(), 1000);
      } catch(e: any) {
          setMsg({ type: 'error', text: 'Failed to update preferences.' });
      } finally {
          setLoading(false);
      }
  };
  
  const isUrl = profileData.profile_pic.startsWith('http');

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
        
        <div>
            <h2 className="text-3xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                <User className="w-8 h-8 text-indigo-600" /> My Profile
            </h2>
            <p className="text-stone-500 dark:text-slate-400">Manage your account settings and security.</p>
        </div>

        {msg && (
            <div className={`p-4 rounded-xl flex items-center gap-2 font-bold ${msg.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                {msg.text}
            </div>
        )}

        {/* --- SECTION 1: PUBLIC PROFILE --- */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-stone-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-stone-800 dark:text-white mb-6">Public Profile</h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <div>
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1 mb-2 block">Profile Icon</label>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-4xl border-2 border-dashed border-stone-200 dark:border-slate-700 overflow-hidden">
                                {isUrl ? (
                                    <img 
                                        src={profileData.profile_pic} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    profileData.profile_pic
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                                <Camera size={14} />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {AVATARS.map(avatar => (
                                <button
                                    key={avatar}
                                    type="button"
                                    onClick={() => setProfileData({...profileData, profile_pic: avatar})}
                                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition hover:scale-110 ${profileData.profile_pic === avatar ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-stone-50 dark:bg-slate-800'}`}
                                >
                                    {avatar}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">Full Name</label>
                    <input 
                        className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-indigo-500 transition" 
                        value={profileData.name} 
                        onChange={e => setProfileData({...profileData, name: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between min-h-[24px] mb-1">
                            <label className="text-xs font-bold text-stone-400 uppercase ml-1">Email Address</label>
                        </div>
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-stone-400 pointer-events-none" />
                            <input 
                                type="email"
                                className="w-full h-[52px] pl-10 px-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-indigo-500 transition" 
                                value={profileData.email} 
                                onChange={e => setProfileData({...profileData, email: e.target.value})}
                                placeholder="Link Email"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col relative">
                        <div className="flex items-center justify-between min-h-[24px] mb-1">
                            <label className="text-xs font-bold text-stone-400 uppercase ml-1">WhatsApp / Mobile</label>
                            {hasMobileLocked && <span className="text-emerald-500 flex items-center gap-1 normal-case text-[10px]"><Lock size={10}/> Locked</span>}
                        </div>
                        
                        <div className="relative flex-1">
                            {hasMobileLocked ? (
                                <>
                                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-emerald-500 pointer-events-none" />
                                    <input 
                                        type="tel"
                                        disabled
                                        className="w-full h-[52px] pl-10 px-3 rounded-xl outline-none font-bold transition border-2 border-transparent bg-stone-100 dark:bg-slate-900 text-stone-500 dark:text-slate-500 cursor-not-allowed" 
                                        value={profileData.mobile} 
                                    />
                                </>
                            ) : (
                                <div className="flex items-center w-full h-[52px] bg-stone-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus-within:border-indigo-500 transition overflow-hidden">
                                    <div className="relative flex items-center border-r border-stone-200 dark:border-slate-700 h-full bg-stone-50 dark:bg-slate-800">
                                        <Phone className="absolute left-2.5 w-4 h-4 text-stone-400 pointer-events-none" />
                                        <select 
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="pl-8 pr-1 py-3 h-full bg-transparent outline-none text-xs font-bold text-stone-700 dark:text-white cursor-pointer appearance-none"
                                        >
                                            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="text-black">{c.label}</option>)}
                                        </select>
                                    </div>
                                    <input 
                                        type="tel"
                                        maxLength={COUNTRY_CODES.find(c => c.code === countryCode)?.len || 10}
                                        className="w-full h-full pl-3 pr-4 bg-transparent outline-none font-bold text-stone-700 dark:text-white" 
                                        value={profileData.mobile} 
                                        onChange={e => setProfileData({...profileData, mobile: e.target.value.replace(/\D/g, '')})}
                                        placeholder="Mobile Number"
                                    />
                                </div>
                            )}
                        </div>
                        {!hasMobileLocked && <p className="absolute -bottom-5 left-1 text-[10px] text-amber-500 font-bold">Cannot be changed once linked.</p>}
                    </div>
                </div>

                <button disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none mt-2">
                    <Save size={18} /> Update Profile
                </button>
            </form>
        </div>

        {/* --- SECTION 2: SECURITY --- */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-stone-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-stone-800 dark:text-white mb-6 flex items-center gap-2">
                <Lock size={20} className="text-rose-500" /> Security
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">Current Password</label>
                    <input type="password" required className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="••••••••" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">New Password</label>
                        <input type="password" required className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="New Password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">Confirm Password</label>
                        <input type="password" required className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="Confirm New" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} />
                    </div>
                </div>

                <button disabled={loading} className="px-6 py-3 bg-stone-900 dark:bg-rose-600 hover:bg-stone-800 dark:hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 mt-4 shadow-lg shadow-stone-200 dark:shadow-none">
                    <CheckCircle2 size={18} /> Change Password
                </button>
            </form>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-stone-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-stone-800 dark:text-white mb-6 flex items-center gap-2">
                <IndianRupee size={20} className="text-emerald-500" /> Financial Preferences
            </h3>
            
            <form onSubmit={handleUpdatePreferences} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">Default Currency</label>
                        <select 
                            className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-emerald-500 transition cursor-pointer"
                            value={prefData.currency}
                            onChange={e => setPrefData({...prefData, currency: e.target.value})}>
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.symbol}>
                                    {c.symbol} ({c.code}) - {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1 block mb-1">Month Starts On (Date)</label>
                        <input 
                            type="number" 
                            min="1" max="31"
                            className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-emerald-500 transition"
                            value={prefData.month_start_date}
                            onChange={e => setPrefData({...prefData, month_start_date: Number(e.target.value)})}
                        />
                        <p className="text-[10px] text-stone-400 mt-1 ml-1 font-medium">Used for calculating monthly budgets and analytics.</p>
                    </div>
                </div>

                <button disabled={loading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-200 dark:shadow-none">
                    <Save size={18} /> Save Preferences
                </button>
            </form>
        </div>
    </div>
  );
}