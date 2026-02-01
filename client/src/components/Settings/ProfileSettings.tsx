import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { User, Lock, Save, Camera, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = "https://sidenote-7o2d.onrender.com";

const AVATARS = ['😎', '👻', '🤖', '🐯', '👽', '🐶', '👑', '💼', '🧢', '🦄', '🦉', '👨‍💻'];

export default function ProfileSettings() {
  const router = useRouter();
  const user = router.options.context?.user;
  
  // States
  const [profileData, setProfileData] = useState({ name: user?.name || '', profile_pic: user?.picture || '😎' });
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
      if (user) {
          setProfileData({
              name: user.name || '',
              profile_pic: user.picture || '😎'
          });
      }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMsg(null);
      try {
          await axios.put(`${API_URL}/auth/profile`, profileData);
          
          const updatedUser = { ...user, name: profileData.name, picture: profileData.profile_pic };
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          
          setMsg({ type: 'success', text: 'Profile updated!' });
          setTimeout(() => window.location.reload(), 1000); 
      } catch(e) {
          setMsg({ type: 'error', text: 'Failed to update profile.' });
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
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1">Full Name</label>
                    <input 
                        className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-indigo-500 transition" 
                        value={profileData.name} 
                        onChange={e => setProfileData({...profileData, name: e.target.value})}
                    />
                </div>

                <button disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none">
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
                    <label className="text-xs font-bold text-stone-400 uppercase ml-1">Current Password</label>
                    <input type="password" required className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="••••••••" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">New Password</label>
                        <input type="password" required className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="New Password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-400 uppercase ml-1">Confirm Password</label>
                        <input type="password" required className="w-full mt-1 p-3 bg-stone-50 dark:bg-slate-800 rounded-xl outline-none font-bold text-stone-700 dark:text-white border-2 border-transparent focus:border-rose-500 transition" placeholder="Confirm New" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} />
                    </div>
                </div>

                <button disabled={loading} className="px-6 py-3 bg-stone-900 dark:bg-rose-600 hover:bg-stone-800 dark:hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 mt-4 shadow-lg shadow-stone-200 dark:shadow-none">
                    <CheckCircle2 size={18} /> Change Password
                </button>
            </form>
        </div>
    </div>
  );
}