import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { 
  LayoutDashboard, PieChart, Wallet, LogOut, Menu, X, Target, Shield, 
  Repeat, Settings, ChevronRight, Trophy, Sun, Moon, ReceiptIndianRupee, HandCoins, UserPen
} from 'lucide-react';
import icon from '../assets/iconNew.png';
import { useTheme } from '../context/ThemeContext';

const UserAvatar = ({ src, name, className }: { src?: string, name: string, className?: string }) => {
  const isUrl = src?.startsWith('http');
  const isEmoji = src && !isUrl;

  if (isEmoji) {
    return (
      <div className={`${className} flex items-center justify-center bg-stone-100 dark:bg-slate-800 text-xl border border-stone-200 dark:border-slate-700 select-none`}>
        {src}
      </div>
    );
  }

  return (
    <img 
      src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`} 
      alt="Profile" 
      className={`${className} object-cover`} 
    />
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const router = useRouter();
  const { user, handleLogout } = router.options.context; 
  const ADMIN_EMAIL = "alakhchaturvedi2002@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

  const menuItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', icon: Shield }] : []),
    { to: '/transactions', label: 'Transactions', icon: Wallet },
    { to: '/budget', label: 'Budgets', icon: Target },
    { to: '/goals', label: 'Savings Goals', icon: Trophy },
    { to: '/debts', label: 'Debts Tracker', icon: HandCoins },
    { to: '/loans', label: 'Loan Tracker', icon: ReceiptIndianRupee },
    { to: '/analytics', label: 'Analytics', icon: PieChart },
    { to: '/recurring', label: 'Recurring Bills', icon: Repeat },
    { to: '/categories', label: 'Categories', icon: Settings },
  ];

  const NavItem = ({ item, onClick }: any) => {
    return (
      <Link
        to={item.to}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium group relative overflow-hidden text-stone-500 hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
        activeProps={{
            className: "!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/20"
        }}
      >
        <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronRight className="w-4 h-4 opacity-0 group-[.active]:opacity-100 text-white/70" />
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F3F4F6] dark:bg-slate-950 transition-colors duration-300 font-sans">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 fixed h-full z-30 pl-4 py-2">
        <div className="h-full bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-indigo-100/50 flex flex-col dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-slate-900/50">
        <div className="p-6 pb-2 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="p-2.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-xl shadow-lg transition-transform group-hover:scale-105">
                    <img src={icon} className="w-6 h-6" alt="" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">FinTrack</h1>
                    {/* <p className="text-xs text-blue-500 font-bold uppercase">Alakh</p> */}
                </div>
            </Link>

            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-500"/>}
            </button>
            </div>

        {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </nav>

            <div className="p-4 mt-auto space-y-2">
               <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-white shadow-sm dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 relative">
                   <Link 
                      to="/settings" 
                      className="absolute top-4 right-4 p-1.5 bg-white text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-stone-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white transition shadow-sm z-10"
                      title="Edit Profile"
                   >
                      <UserPen size={14} />
                   </Link>

                   <div className="flex items-center gap-3 mb-4 pr-8">
                      <UserAvatar 
                        src={user.picture} 
                        name={user.name} 
                        className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-600 shadow-sm"
                      />
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-700 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                      </div>
                   </div>
                   <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-500 bg-white hover:bg-rose-50 rounded-xl font-bold border border-rose-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-rose-900/20">
                     <LogOut className="w-4 h-4" /> Sign Out
                   </button>
               </div>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/90 backdrop-blur-lg z-50 px-5 py-3 flex justify-between items-center border-b border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-800">
         <Link to="/dashboard" className="flex items-center gap-2">
             <div className="p-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-lg shadow-lg">
                <img src={icon} className="w-6 h-6" alt="Logo" />
             </div>
            <span className="font-bold text-slate-800 text-lg dark:text-white">FinTrack</span>
         </Link>
         
         <div className="flex items-center gap-2">
             <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
             >
                {theme === 'dark' ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-500"/>}
             </button>
             <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2.5 bg-slate-100 rounded-xl dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
             >
                <Menu className="w-6 h-6" />
             </button>
         </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
           <div className="absolute right-0 top-0 h-full w-[85%] max-w-xs bg-white shadow-2xl p-6 flex flex-col animate-in slide-in-from-right dark:bg-slate-900">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Menu</h2>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full dark:bg-slate-800 dark:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      src={user.picture} 
                      name={user.name} 
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-24">{user.email}</p>
                    </div>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-white text-stone-400 border border-stone-200 rounded-lg hover:text-indigo-600 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400"
                  >
                     <UserPen size={16} />
                  </Link>
              </div>

              <nav className="space-y-2 flex-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavItem key={item.to} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                ))}
              </nav>

              <div className="mt-6 space-y-3">
                 <button onClick={handleLogout} className="w-full py-3.5 text-rose-600 font-bold bg-rose-50 rounded-2xl flex items-center justify-center gap-2 dark:bg-rose-900/20 dark:text-rose-400">
                    <LogOut size={18} /> Sign Out
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-80 p-5 md:p-8 mt-20 md:mt-0 transition-all duration-300 w-full overflow-x-hidden dark:text-slate-200">
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;