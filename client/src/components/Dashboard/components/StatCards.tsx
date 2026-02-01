import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

const Card = ({ title, amount, icon: Icon, type }: any) => {
  const styles = {
    balance: { 
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-700', 
        text: 'text-white', 
        sub: 'text-blue-100', 
        icon: 'bg-white/20 text-white',
        border: 'border-white/20'
    },
    income: { 
        bg: 'bg-white dark:bg-slate-900', 
        text: 'text-slate-800 dark:text-white', 
        sub: 'text-slate-400 dark:text-slate-500', 
        icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        border: 'border-white/50 dark:border-slate-800'
    },
    expense: { 
        bg: 'bg-white dark:bg-slate-900', 
        text: 'text-slate-800 dark:text-white', 
        sub: 'text-slate-400 dark:text-slate-500', 
        icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        border: 'border-white/50 dark:border-slate-800'
    },
  }[type as 'balance' | 'income' | 'expense'];

  return (
    <div className={`${styles.bg} ${styles.border} p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className={`${styles.sub} text-sm font-bold mb-2 uppercase tracking-wide`}>{title}</p>
          <h3 className={`${styles.text} text-3xl font-extrabold tracking-tight`}>
            ₹{amount.toLocaleString('en-IN')}
          </h3>
        </div>
        <div className={`p-4 rounded-2xl ${styles.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default function StatCards({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card title="Total Balance" amount={stats.balance} icon={Wallet} type="balance" />
      <Card title="Total Income" amount={stats.income} icon={TrendingUp} type="income" />
      <Card title="Total Expenses" amount={stats.expense} icon={TrendingDown} type="expense" />
    </div>
  );
}