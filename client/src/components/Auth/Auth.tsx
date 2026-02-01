import { useState } from 'react';
import axios from 'axios';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { Mail, Phone, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  
  // Data States
  const [formData, setFormData] = useState({ name: '', contact: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = "https://sidenote-q60v.onrender.com";

  const validateForm = () => {
    if (method === 'mobile') {
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(formData.contact)) {
            return "Mobile number must be 10 digits and start with 6-9.";
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
    
    try {
        if (mode === 'signup') {
            if(!formData.name) throw new Error("Name is required.");
            
            await axios.post(`${API_URL}/auth/register`, {
                name: formData.name,
                contact: formData.contact,
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
                contact: formData.contact,
                new_password: formData.password
            });
            setSuccessMsg(res.data.message);
            setMode('login');
            setFormData(prev => ({...prev, password: ''}));
        }
        else {
            const res = await axios.post(`${API_URL}/auth/login`, {
                contact: formData.contact,
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
    <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 animate-fade-in-up transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-800">
                {mode === 'login' ? 'Welcome Back' : (mode === 'reset' ? 'Reset Password' : 'Create Account')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                {mode === 'reset' ? 'Verify your identity to proceed.' : 'Manage your finances intelligently.'}
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
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with</span></div>
                </div>
            </>
        )}

        {/* Method Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button onClick={() => { setMethod('email'); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${method === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Email</button>
            <button onClick={() => { setMethod('mobile'); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${method === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Mobile</button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
            {(mode === 'signup' || mode === 'reset') && (
                <div className="relative group animate-in slide-in-from-top-2 fade-in">
                    <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="Full Name (For Verification)"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
            )}

            {/* Contact Field */}
            <div className="relative group">
                {method === 'email' ? <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" /> : <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
                <input 
                    type={method === 'mobile' ? 'tel' : 'text'}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder={method === 'email' ? "Email Address" : "Mobile Number"}
                    value={formData.contact}
                    onChange={e => {
                        const val = method === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
                        setFormData({...formData, contact: val});
                    }}
                />
            </div>
            
            {/* Password Field (New Password for Reset) */}
            <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    type="password"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder={mode === 'reset' ? "New Password" : "Password"}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>
        </div>

        {/* Forgot Password Link (Login Only) */}
        {mode === 'login' && (
            <div className="mt-3 text-right">
                <button 
                    onClick={() => switchMode('reset')}
                    className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                >
                    Forgot Password?
                </button>
            </div>
        )}

        {/* Feedback Messages */}
        {error && <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-rose-100"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="leading-tight">{error}</span></div>}
        {successMsg && <div className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1 border border-emerald-100"><CheckCircle className="w-4 h-4 shrink-0" />{successMsg}</div>}

        {/* Submit Button */}
        <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
        >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : (mode === 'reset' ? 'Update Password' : 'Create Account'))}
            {!loading && <ArrowRight className="w-4 h-4" />}
        </button>

        {/* Bottom Navigation */}
        <div className="mt-6 text-center">
            {mode === 'reset' ? (
                <button 
                    onClick={() => switchMode('login')}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
            ) : (
                <p className="text-slate-500 text-sm font-medium">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"} 
                    <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="ml-2 font-bold text-blue-600 hover:underline">
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            )}
        </div>
    </div>
  );
}