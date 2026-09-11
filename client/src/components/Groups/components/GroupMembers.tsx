import { Shield, User, RefreshCw, Share2, QrCode, Copy, Check, UserMinus } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export interface GroupMember {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface GroupMembersProps {
  members: GroupMember[] | null | undefined;
  currentUserId: number;
  group: { name: string; invite_code: string; invite_expires_at: string } | null;
  onRefreshCode: () => void;
  onRemoveMember?: (targetId: number, targetName: string) => void;
}

export default function GroupMembers({ members, currentUserId, group, onRefreshCode, onRemoveMember }: GroupMembersProps) {
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
    if(group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const currentUserRole = members?.find(m => m.id === currentUserId)?.role;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 tracking-widest uppercase pl-1">
          Invite Friends
        </h3>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[1.5rem] p-1 shadow-lg">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[1.35rem] p-5 h-full">
            {isExpired ? (
              <div className="flex flex-col items-center text-center p-4">
                <p className="text-sm text-rose-600 dark:text-rose-400 font-bold mb-4">⚠️ Invite code has expired.</p>
                <button 
                  onClick={onRefreshCode} 
                  className="flex items-center justify-center gap-2 text-sm font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-xl transition-all active:scale-95 w-full"
                >
                  <RefreshCw size={16} /> Generate New Code
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group Code</p>
                      {timeLeft && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/30">
                          Expires in {timeLeft}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-3xl font-black text-slate-900 dark:text-white tracking-[0.2em]">
                        {group?.invite_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleCopyCode} 
                      className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-colors active:scale-95" 
                      title="Copy Code"
                    >
                      {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                    <button 
                      onClick={onRefreshCode} 
                      className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-colors active:scale-95" 
                      title="Generate New Code"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-stone-100 dark:border-white/5">
                  <button 
                    onClick={handleShare} 
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <Share2 size={16} /> Share Link
                  </button>
                  <button 
                    onClick={() => setShowQR(!showQR)} 
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-sm font-bold py-3 rounded-xl transition-all active:scale-95"
                  >
                    <QrCode size={16} /> {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>

                {showQR && (
                  <div className="mt-4 p-6 bg-white dark:bg-white rounded-2xl flex flex-col items-center justify-center animate-in zoom-in-95 border border-stone-200 shadow-inner">
                    <QRCode value={waLink} size={160} level="M" />
                    <p className="text-xs font-bold text-slate-500 mt-4 text-center">Scan with camera to join</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 👥 Members List */}
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-3 tracking-widest uppercase pl-1">
          Group Members ({members?.length || 0})
        </h3>
        <div className="space-y-3">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 flex items-center justify-center font-bold text-sm border border-stone-200 dark:border-white/5">
                    {getInitials(m.name)}
                 </div>
                 <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                      {m.name} 
                      {m.id === currentUserId && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md">You</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{m.email}</div>
                 </div>
              </div>
              
              <div className="flex items-center gap-2">
                {m.role === 'admin' ? (
                   <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/10 dark:text-amber-500 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                      <Shield size={12} /> Admin
                   </div>
                ) : (
                   <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/5 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-100 dark:border-white/5">
                      <User size={12} /> Member
                   </div>
                )}

                {currentUserRole === 'admin' && m.id !== currentUserId && onRemoveMember && (
                  <button 
                    onClick={() => onRemoveMember(m.id, m.name)}
                    className="p-2 ml-1 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-900/20 rounded-xl transition-colors active:scale-95"
                    title="Remove Member"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}