import { useState } from 'react';
import axios from 'axios';
import { Link, useRouter } from '@tanstack/react-router';
import { Phone, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Logo from '../Logo';

const COUNTRY_CODES = [
    { code: '91', label: '+91 (IN)', len: 10 },
    { code: '1', label: '+1 (US/CA)', len: 10 },
    { code: '44', label: '+44 (UK)', len: 10 },
];

export default function ResetPassword() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [step, setStep] = useState<'identify' | 'password' | 'otp'>('identify');
  const [countryCode, setCountryCode] = useState('91');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', mobile: '', newPassword: '', confirmPassword: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = "https://api.sidenote.in";
  const currentConfig = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];
  const targetMobile = `${countryCode}${formData.mobile}`;

  const validatePassword = () => {
      const pw = formData.newPassword;
      if (pw.length < 8) return "Password must be at least 8 characters.";
      if (!/[A-Z]/.test(pw)) return "Password must have at least 1 uppercase letter.";
      if (!/[a-z]/.test(pw)) return "Password must have at least 1 lowercase letter.";
      if (!/[0-9]/.test(pw)) return "Password must have at least 1 number.";
      if (pw !== formData.confirmPassword) return "Passwords do not match.";
      return null;
  };

  const handleNext = async () => {
      setError(''); setSuccessMsg('');

      if (step === 'identify') {
          if (!formData.name.trim()) return setError("Full Name is required.");
          if (formData.mobile.length !== currentConfig.len) return setError(`Mobile number must be ${currentConfig.len} digits.`);
          setStep('password');
      } 
      else if (step === 'password') {
          const pwError = validatePassword();
          if (pwError) return setError(pwError);

          setLoading(true);
          try {
              await axios.post(`${API_URL}/auth/reset-password`, {
                  name: formData.name,
                  contact: targetMobile,
                  new_password: formData.newPassword
              });
              setSuccessMsg("Verification code sent to your WhatsApp!");
              setStep('otp');
          } catch (err: any) {
              setError(err.response?.data?.detail || "Details do not match any account.");
          } finally {
              setLoading(false);
          }
      }
      else if (step === 'otp') {
          if (formData.otp.length !== 4) return setError("OTP must be 4 digits.");
          setLoading(true);
          try {
              await axios.post(`${API_URL}/auth/verify`, { contact: targetMobile, otp: formData.otp });
              setSuccessMsg("Password reset successful! Redirecting...");
              setTimeout(() => router.navigate({ to: '/login' }), 2000);
          } catch (err: any) {
              setError(err.response?.data?.detail || "Invalid OTP");
          } finally {
              setLoading(false);
          }
      }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-cover bg-center relative" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        
        <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
            <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 animate-fade-in-up">
                
                <button onClick={toggleTheme} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors z-10">
                    {theme === 'dark' ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-500"/>}
                </button>

                <div className="text-center mb-6 md:mb-8 mt-2 md:mt-0">
                    <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
                        <Logo variant="app-icon" textSize="text-2xl" />
                        <span className="font-extrabold tracking-tight text-3xl md:text-4xl text-[#111111] dark:text-white leading-none">Side<span className="text-[#25D366]">Note</span></span>
                    </div>
                    <h1 className="text-lg md:text-xl font-bold text-[#111111] dark:text-white">Reset Password</h1>
                    {step === 'identify' && <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Registered via Email? Please <Link to="/login" className="text-[#25D366] hover:underline font-bold">login with Google</Link>.</p>}
                </div>

                <div className="space-y-4">
                    {step === 'identify' && (
                        <div className="animate-in slide-in-from-right-4 space-y-4">
                            <div className="relative group">
                                <UserIcon className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                                <input 
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400"
                                    placeholder="Registered Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="flex w-full">
                                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-r-0 rounded-l-xl focus-within:ring-2 focus-within:ring-[#25D366]/30 z-10 transition-all">
                                    <Phone className="absolute left-2.5 md:left-3 w-4 h-4 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="pl-8 md:pl-9 pr-1 md:pr-2 py-2.5 md:py-3 bg-transparent outline-none text-xs md:text-sm font-bold text-[#111111] dark:text-white cursor-pointer appearance-none">
                                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="text-black">{c.label}</option>)}
                                    </select>
                                </div>
                                <input 
                                    type="tel" maxLength={currentConfig.len}
                                    className="w-full pl-3 md:pl-4 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400"
                                    placeholder="WhatsApp Number" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'password' && (
                        <div className="animate-in slide-in-from-right-4 space-y-4">
                            <p className="text-sm text-slate-500 text-center mb-2">Create a new secure password.</p>
                            <div className="relative group">
                                <Lock className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-10 md:pl-12 pr-12 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400"
                                    placeholder="New Password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 md:right-4 top-3 md:top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400"
                                    placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'otp' && (
                        <div className="text-center space-y-4 animate-in slide-in-from-right-4">
                            <p className="text-sm text-slate-500 mb-6">Enter the 4-digit code sent to your WhatsApp.</p>
                            <input 
                                type="text" maxLength={4} placeholder="••••"
                                className="w-full text-center tracking-[1em] text-3xl font-bold py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white"
                                value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                            />
                        </div>
                    )}
                </div>

                {error && <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in border border-rose-100 dark:border-rose-900/30"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="leading-tight">{error}</span></div>}
                {successMsg && <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in border border-emerald-100 dark:border-emerald-900/30"><CheckCircle className="w-4 h-4 shrink-0" />{successMsg}</div>}

                <button 
                    onClick={handleNext} disabled={loading}
                    className="w-full mt-5 md:mt-6 bg-[#111111] dark:bg-[#25D366] text-white py-3 md:py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg text-sm md:text-base"
                >
                    {loading ? 'Processing...' : (step === 'identify' ? 'Continue' : step === 'password' ? 'Reset & Send OTP' : 'Verify')}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="mt-5 md:mt-6 text-center">
                    <Link to="/login" className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center gap-2 mx-auto">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    </div>
  );
}