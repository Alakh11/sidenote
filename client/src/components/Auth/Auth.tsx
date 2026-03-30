import { useState } from 'react';
import axios from 'axios';
import Logo from '.././Logo';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { Mail, Phone, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AuthProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const COUNTRY_CODES = [
    { code: '91', label: '+91 (IN)' },
    { code: '1', label: '+1 (US/CA)' },
    { code: '44', label: '+44 (UK)' },
    { code: '61', label: '+61 (AU)' },
    { code: '971', label: '+971 (AE)' },
    { code: '65', label: '+65 (SG)' },
    { code: '27', label: '+27 (ZA)' },
];

export default function Auth({ onLoginSuccess }: AuthProps) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  
  // Data States
  const [countryCode, setCountryCode] = useState('91');
  const [formData, setFormData] = useState({ name: '', contact: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = "https://sidenote-8nu4.onrender.com";

  const validateForm = () => {
    if (method === 'mobile') {
        const mobileRegex = /^\d{7,15}$/;
        if (!mobileRegex.test(formData.contact)) {
            return "Please enter a valid mobile number.";
        }
    }

    if (method === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.contact)) {
            return "Please enter a valid email address.";
        }
    }

    if (mode === 'signup' || mode === 'reset') {
        const pw = formData.password;
        if (pw.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(pw)) return "Password must have 1 Uppercase letter.";
        if (!/[a-z]/.test(pw)) return "Password must have 1 Lowercase letter.";
        if (!/[0-9]/.test(pw)) return "Password must have 1 number.";
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "Password must contain at least one special character.";
        if (!formData.name.trim()) return "Full Name is required for verification.";
    }

    return null; 
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMsg('');
    
    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    setLoading(true);

    const finalContact = method === 'mobile' ? `${countryCode}${formData.contact}` : formData.contact;
    
    try {
        if (mode === 'signup') {
            if(!formData.name) throw new Error("Name is required.");
            
            await axios.post(`${API_URL}/auth/register`, {
                name: formData.name,
                contact: finalContact,
                password: formData.password,
                contact_type: method
            });
            
            setSuccessMsg("Account created successfully! Please login.");
            setMode('login'); 
            setFormData(prev => ({...prev, password: ''})); 
        } 
        else if (mode === 'reset') {
            const res = await axios.post(`${API_URL}/auth/reset-password`, {
                name: formData.name,
                contact: finalContact,
                new_password: formData.password
            });
            setSuccessMsg(res.data.message);
            setMode('login');
            setFormData(prev => ({...prev, password: ''}));
        }
        else {
            const res = await axios.post(`${API_URL}/auth/login`, {
                contact: finalContact,
                password: formData.password
            });
            onLoginSuccess(res.data.user, res.data.token);
        }
    } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Request failed");
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
        try {
            setLoading(true);
            const decoded: any = jwtDecode(credentialResponse.credential);
            const res = await axios.post(`${API_URL}/auth/google`, {
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture
            });
            onLoginSuccess(res.data.user, res.data.token);
        } catch (err) {
            setError("Google Login Failed");
        } finally {
            setLoading(false);
        }
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
      setMode(newMode);
      setError('');
      setSuccessMsg('');
      setFormData({ name: '', contact: '', password: '' });
  };

  return (
    <div className="relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 animate-fade-in-up transition-all duration-300">
        
        <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors z-10"
            title="Toggle Theme"
        >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-500"/>}
        </button>

        <div className="text-center mb-6 md:mb-8 mt-2 md:mt-0">
            <div className="flex justify-center mb-4 md:mb-6">
                <Logo variant="wordmark" textSize="text-3xl md:text-4xl" />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-[#111111] dark:text-white">
                {mode === 'login' ? 'Welcome Back' : (mode === 'reset' ? 'Reset Password' : 'Create Account')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 italic">
                {mode === 'reset' ? 'Verify your identity to proceed.' : '"Manage your finances intelligently."'}
            </p>
        </div>

        {/* Google Button (Hide in Reset Mode) */}
        {mode !== 'reset' && (
            <>
                <div className="flex justify-center mb-6">
                    <GoogleLogin 
                        onSuccess={handleGoogleSuccess} 
                        onError={() => setError("Google Login Failed")}
                        shape="pill"
                        width="100%"
                        text={mode === 'login' ? "signin_with" : "signup_with"}
                    />
                </div>
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                    <div className="relative flex justify-center text-xs md:text-sm"><span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Or continue with</span></div>
                </div>
            </>
        )}

        {/* Method Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5 md:mb-6">
            <button onClick={() => { setMethod('email'); setError(''); }} className={`flex-1 py-1.5 md:py-2 rounded-lg text-sm font-bold transition ${method === 'email' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#25D366]' : 'text-slate-500 dark:text-slate-400'}`}>Email</button>
            <button onClick={() => { setMethod('mobile'); setError(''); }} className={`flex-1 py-1.5 md:py-2 rounded-lg text-sm font-bold transition ${method === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#25D366]' : 'text-slate-500 dark:text-slate-400'}`}>Mobile</button>
        </div>

        {/* Inputs */}
        <div className="space-y-3 md:space-y-4">
            {(mode === 'signup' || mode === 'reset') && (
                <div className="relative group animate-in slide-in-from-top-2 fade-in">
                    <UserIcon className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                    <input 
                        className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="Full Name (For Verification)"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
            )}

            {/* Contact Field (Dynamic based on Email/Mobile) */}
            <div className="relative group flex">
                {method === 'email' ? (
                    <>
                        <Mail className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors z-10" />
                        <input 
                            type="text"
                            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Email Address"
                            value={formData.contact}
                            onChange={e => setFormData({...formData, contact: e.target.value})}
                        />
                    </>
                ) : (
                    <div className="flex w-full">
                        {/* Country Code Dropdown */}
                        <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-r-0 rounded-l-xl focus-within:ring-2 focus-within:ring-[#25D366]/30 z-10 transition-all">
                            <Phone className="absolute left-2.5 md:left-3 w-4 h-4 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                            <select 
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="pl-8 md:pl-9 pr-1 md:pr-2 py-2.5 md:py-3 bg-transparent outline-none text-xs md:text-sm font-bold text-[#111111] dark:text-white cursor-pointer appearance-none"
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code} value={c.code} className="text-black">{c.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Mobile Number Input */}
                        <input 
                            type="tel"
                            className="w-full pl-3 md:pl-4 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Mobile Number"
                            value={formData.contact}
                            onChange={e => {
                                // Strip non-digits and allow up to 15 digits
                                const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                                setFormData({...formData, contact: val});
                            }}
                        />
                    </div>
                )}
            </div>
            
            {/* Password Field */}
            <div className="relative group">
                <Lock className="absolute left-3 md:left-4 top-3 md:top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-[#25D366] transition-colors" />
                <input 
                    type="password"
                    className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder={mode === 'reset' ? "New Password" : "Password"}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>
        </div>

        {/* Forgot Password Link (Login Only) */}
        {mode === 'login' && (
            <div className="mt-2.5 md:mt-3 text-right">
                <button 
                    onClick={() => switchMode('reset')}
                    className="text-xs md:text-sm font-bold text-slate-400 hover:text-[#25D366] transition-colors"
                >
                    Forgot Password?
                </button>
            </div>
        )}

        {/* Feedback Messages */}
        {error && <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-rose-100 dark:border-rose-900/30"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="leading-tight">{error}</span></div>}
        {successMsg && <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-emerald-100 dark:border-emerald-900/30"><CheckCircle className="w-4 h-4 shrink-0" />{successMsg}</div>}

        {/* Submit Button */}
        <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full mt-5 md:mt-6 bg-[#111111] dark:bg-[#25D366] text-white dark:text-white py-3 md:py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-200 dark:shadow-[#25D366]/20 text-sm md:text-base"
        >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : (mode === 'reset' ? 'Update Password' : 'Create Account'))}
            {!loading && <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        {/* Bottom Navigation */}
        <div className="mt-5 md:mt-6 text-center">
            {mode === 'reset' ? (
                <button 
                    onClick={() => switchMode('login')}
                    className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
            ) : (
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"} 
                    <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="ml-1.5 md:ml-2 font-bold text-[#25D366] hover:underline">
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            )}
        </div>
    </div>
  );
}