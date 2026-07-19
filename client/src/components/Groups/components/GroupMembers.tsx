import { Shield, User, RefreshCw, Share2, QrCode, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export default function GroupMembers({ members, currentUserId, group, onRefreshCode }: any) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const isExpired = group?.invite_code === 'Expired';
  const joinText = `join ${group?.invite_code}`;
  
  useEffect(() => {
    if (!group?.invite_expires_at || isExpired) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const expiryTime = new Date(group.invite_expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft('0:00');
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    };

    updateTimer(); 
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [group?.invite_expires_at, isExpired]);
  
  const waLink = `https://wa.me/918796022992?text=${encodeURIComponent(joinText)}`;

  const shareMessage = `Join my group "${group?.name}" on SideNote! 📝\n\nClick this link to join instantly:\n${waLink}\n\nOr send this code on WhatsApp: ${joinText}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareMessage }).catch((err) => console.log('Share cancelled', err));
    } else {
      navigator.clipboard.writeText(shareMessage);
      alert("Invite message copied to clipboard!");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group?.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* 🚀 Invite Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 shadow-sm">
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">Invite Friends</h3>
        
        {isExpired ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ Invite code has expired.</p>
            <button 
              onClick={onRefreshCode} 
              className="flex items-center justify-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl shadow-sm border border-stone-100 dark:border-white/5 hover:scale-105 transition-transform"
            >
              <RefreshCw size={14} /> Generate New Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-stone-100 dark:border-white/5 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group Code</p>
                   {timeLeft && (
                     <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/30">
                       Expires in {timeLeft}
                     </span>
                   )}
                </div>
                
                <div className="flex items-center gap-3">
                  <p className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-widest">
                    {group?.invite_code}
                  </p>
                  <button 
                    onClick={handleCopyCode} 
                    className="p-1.5 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-lg transition-colors" 
                    title="Copy Code Only"
                  >
                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <button 
                onClick={onRefreshCode} 
                className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-white/5 rounded-xl transition-colors" 
                title="Generate New Code"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleShare} 
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-sm"
              >
                <Share2 size={16} /> Share Link
              </button>
              <button 
                onClick={() => setShowQR(!showQR)} 
                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-sm font-bold py-3 rounded-xl transition-colors shadow-sm"
              >
                <QrCode size={16} /> {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            </div>

            {/* Toggleable QR Code Display */}
            {showQR && (
              <div className="mt-4 p-6 bg-white rounded-2xl flex flex-col items-center justify-center animate-in zoom-in-95 border border-stone-100 shadow-inner">
                 <QRCode value={waLink} size={180} level="M" />
                 <p className="text-xs font-medium text-slate-500 mt-4 text-center">Scan with phone camera to join</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 👥 Members List */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 tracking-wider uppercase pl-1">
          Group Members ({members?.length || 0})
        </h3>
        <div className="space-y-3">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#252525] border border-stone-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 dark:bg-black/20 dark:text-slate-300 flex items-center justify-center font-bold text-sm">
                    {getInitials(m.name)}
                 </div>
                 <div>
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {m.name} {m.id === currentUserId && <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/30">You</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
                 </div>
              </div>
              {m.role === 'admin' ? (
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-500 px-3 py-1.5 rounded-full">
                    <Shield size={12} /> Admin
                 </div>
              ) : (
                 <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5 px-3 py-1.5 rounded-full">
                    <User size={12} /> Member
                 </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}