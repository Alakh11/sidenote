import { useState } from 'react';
import axios from 'axios';
import Logo from '.././Logo';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { Mail, Phone, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AuthProps {
  onLoginSuccess: (user: any, token: string) => void;
}

const COUNTRY_CODES = [
    { code: '91', label: '+91 (IN)', len: 10 },
    { code: '1', label: '+1 (US/CA)', len: 10 },
    { code: '44', label: '+44 (UK)', len: 10 },
    { code: '61', label: '+61 (AU)', len: 9 },
    { code: '971', label: '+971 (AE)', len: 9 },
    { code: '65', label: '+65 (SG)', len: 8 },
    { code: '27', label: '+27 (ZA)', len: 9 },
];

export default function Auth({ onLoginSuccess }: AuthProps) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  const [authStep, setAuthStep] = useState<'form' | 'collect_mobile' | 'otp'>('form');
  
  // Data States
  const [countryCode, setCountryCode] = useState('91');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '', password: '', extraMobile: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = "https://api.sidenote.in";

  const currentConfig = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const isFormValid = () => {
    if (authStep === 'otp') {
        return formData.otp.length === 4;
    }
    if (authStep === 'collect_mobile') {
        return formData.extraMobile.length === currentConfig.len && 
               (countryCode === '91' ? /^[6-9]/.test(formData.extraMobile) : true);
    }

    // Contact Validation
    let isContactValid = false;
    if (method === 'email') {
        isContactValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact);
    } else {
        isContactValid = formData.contact.length === currentConfig.len &&
                         (countryCode === '91' ? /^[6-9]/.test(formData.contact) : true);
    }

    const isPasswordValid = mode === 'login' 
        ? formData.password.length > 0
        : (formData.password.length >= 8 && 
           /[A-Z]/.test(formData.password) && 
           /[a-z]/.test(formData.password) && 
           /[0-9]/.test(formData.password) && 
           /[!@#$%^&*(),.?":{}|<>\-_]/.test(formData.password));

    // Name Validation
    const isNameValid = (mode === 'signup' || mode === 'reset') 
        ? formData.name.trim().length > 0 
        : true;

    return isContactValid && isPasswordValid && isNameValid;
  };

  const canSubmit = isFormValid();

  const validateForm = () => {
    if (method === 'mobile' || authStep === 'collect_mobile') {
        const val = authStep === 'collect_mobile' ? formData.extraMobile : formData.contact;
        if (val.length !== currentConfig.len) {
            return `${currentConfig.len} digit mobile number required.`;
        }
        if (countryCode === '91' && !/^[6-9]/.test(val)) {
            return "Indian mobile numbers must start with 6, 7, 8, or 9.";
        }
    }

    if (method === 'email' && authStep === 'form') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.contact)) {
            return "Please enter a valid email address.";
        }
    }

    if (mode === 'signup' || mode === 'reset') {
        const pw = formData.password;
        if (pw.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(pw)) return "Password must have at least 1 uppercase letter.";
        if (!/[a-z]/.test(pw)) return "Password must have at least 1 lowercase letter.";
        if (!/[0-9]/.test(pw)) return "Password must have at least 1 number.";
        if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(pw)) return "Password must contain at least 1 special character.";
        if (mode === 'signup' && !formData.name.trim()) return "Full Name is required for verification.";
    }

    return null; 
  };

  const handleNextStep = async () => {
    setError('');
    setSuccessMsg('');
    
    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    if (mode === 'signup' && method === 'email' && authStep === 'form') {
        setAuthStep('collect_mobile');
        return;
    }

    if (authStep === 'otp') {
        verifyOTP();
        return;
    }

    await processBackendRequest();
  };

  const getTargetMobile = () => {
      return method === 'mobile' ? `${countryCode}${formData.contact}` : `${countryCode}${formData.extraMobile}`;
  };

  const processBackendRequest = async () => {
    setLoading(true);
    const finalContact = method === 'mobile' ? getTargetMobile() : formData.contact;
    
    try {
        if (mode === 'signup') {
            await axios.post(`${API_URL}/auth/register`, {
                name: formData.name,
                contact: finalContact,
                password: formData.password,
                contact_type: method,
                extra_mobile: method === 'email' ? getTargetMobile() : undefined
            });
            setSuccessMsg("OTP sent to your WhatsApp!");
            setAuthStep('otp');
        } 
        else if (mode === 'reset') {
            await axios.post(`${API_URL}/auth/reset-password`, {
                name: formData.name,
                contact: finalContact,
                new_password: formData.password
            });
            setSuccessMsg("Verification code sent to WhatsApp!");
            setAuthStep('otp');
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

  const verifyOTP = async () => {
      setLoading(true);
      try {
          const res = await axios.post(`${API_URL}/auth/verify`, {
              contact: getTargetMobile(),
              otp: formData.otp
          });
          if (mode === 'reset') {
              setSuccessMsg("Password reset successful! Please login.");
              switchMode('login');
          } else {
              onLoginSuccess(res.data.user, res.data.token);
          }
      } catch (err: any) {
          setError(err.response?.data?.detail || "Invalid OTP");
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
      setAuthStep('form');
      setError('');
      setSuccessMsg('');
      setFormData({ name: '', contact: '', password: '', extraMobile: '', otp: '' });
  };

  return (
    <div className="relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 animate-fade-in-up transition-all duration-300">
        
        <button onClick={toggleTheme} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors z-10">
            {theme === 'dark' ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-500"/>}
        </button>

        <div className="text-center mb-6 md:mb-8 mt-2 md:mt-0">
            <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
                <Logo variant="app-icon" textSize="text-2xl" />
                <span className="font-extrabold tracking-tight text-3xl md:text-4xl text-[#111111] dark:text-white leading-none">
                    Side<span className="text-[#25D366]">Note</span>
                </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-[#111111] dark:text-white">
                {authStep === 'otp' ? 'Verify Identity' : (mode === 'login' ? 'Welcome Back' : (mode === 'reset' ? 'Reset Password' : 'Create Account'))}
            </h1>
            {authStep === 'form' && (
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 italic">
                    {mode === 'reset' ? 'Verify your identity to proceed.' : '"Manage your finances intelligently."'}
                </p>
            )}
        </div>

        {authStep === 'form' && (
            <>
                {/* Google Button */}
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
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    )}

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
                                <input 
                                    type="tel"
                                    maxLength={currentConfig.len}
                                    className="w-full pl-3 md:pl-4 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Mobile Number"
                                    value={formData.contact}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
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
                            type={showPassword ? "text" : "password"}
                            className="w-full pl-10 md:pl-12 pr-12 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder={mode === 'reset' ? "New Password" : "Password"}
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 md:right-4 top-3 md:top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

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
            </>
        )}

        {/* --- STEP 2: COLLECT MOBILE --- */}
        {authStep === 'collect_mobile' && (
            <div className="space-y-4 text-center animate-in slide-in-from-right-4">
                <p className="text-sm text-slate-500 mb-6">Link your WhatsApp to receive your OTP.</p>
                <div className="flex w-full">
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
                    <input 
                        type="tel"
                        maxLength={currentConfig.len}
                        className="w-full pl-3 md:pl-4 pr-4 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl outline-none font-medium text-[#111111] dark:text-white focus:ring-2 focus:ring-[#25D366]/30 transition-all text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="WhatsApp Number"
                        value={formData.extraMobile}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData({...formData, extraMobile: val});
                        }}
                    />
                </div>
            </div>
        )}

        {/* --- STEP 3: OTP VERIFICATION --- */}
        {authStep === 'otp' && (
            <div className="text-center space-y-4 animate-in slide-in-from-right-4">
                <p className="text-sm text-slate-500 mb-6">We've sent a 4-digit code to your WhatsApp.</p>
                <input 
                    type="text" 
                    maxLength={4}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] text-3xl font-bold py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white"
                    value={formData.otp}
                    onChange={e => setFormData({...formData, otp: e.target.value.replace(/\D/g, '')})}
                />
            </div>
        )}

        {/* Feedback Messages */}
        {error && <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-rose-100 dark:border-rose-900/30"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="leading-tight">{error}</span></div>}
        {successMsg && <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-emerald-100 dark:border-emerald-900/30"><CheckCircle className="w-4 h-4 shrink-0" />{successMsg}</div>}

        {/* Submit Button */}
        <button 
            onClick={handleNextStep} 
            disabled={loading || !canSubmit}
            className="w-full mt-5 md:mt-6 bg-[#111111] dark:bg-[#25D366] text-white dark:text-white py-3 md:py-3.5 rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 dark:shadow-[#25D366]/20 text-sm md:text-base"
        >
            {loading ? 'Processing...' : (authStep === 'form' ? (mode === 'login' ? 'Sign In' : (mode === 'reset' ? 'Send Code' : 'Continue')) : (authStep === 'otp' ? 'Verify' : 'Send Code'))}
            {!loading && <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
        </button>

        {/* Bottom Navigation */}
        <div className="mt-5 md:mt-6 text-center">
            {authStep !== 'form' ? (
                <button 
                    onClick={() => setAuthStep(authStep === 'otp' && mode === 'signup' && method === 'email' ? 'collect_mobile' : 'form')}
                    className="text-xs md:text-sm font-bold text-slate-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            ) : mode === 'reset' ? (
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