import { Sparkles, TrendingUp, TrendingDown, Info } from 'lucide-react';

const getAlertStyles = (type: string) => {
  switch (type) {
    case 'warning':
      return {
        card: 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/50 dark:text-rose-300',
        icon: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
      };
    case 'success':
      return {
        card: 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-300',
        icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
      };
    default: // Info/Blue
      return {
        card: 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-300',
        icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
      };
  }
};

export default function SmartInsights({ prediction, insights }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Prediction Card */}
      {/* In Dark Mode: We use a slightly lighter slate (800) or a gradient to distinguish it from the page bg */}
      <div className="bg-slate-900 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden shadow-xl flex flex-col justify-center border border-transparent dark:border-slate-700">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles size={120} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-slate-400 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Expense Prediction</h3>
          </div>
          <p className="text-4xl font-black mb-3 text-white">₹{prediction?.predicted_spend?.toLocaleString() || '0'}</p>
          <p className="text-sm text-slate-300 dark:text-slate-400 leading-relaxed max-w-[80%]">
            Based on your spending habits, this is your expected expense for next month.
          </p>
        </div>
      </div>

      {/* Smart Alerts Container */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3 justify-center transition-colors duration-300">
        {insights?.length > 0 ? (
          insights.map((insight: any, i: number) => {
            const styles = getAlertStyles(insight.type);
            
            return (
              <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 transition-colors ${styles.card}`}>
                <div className={`p-2.5 rounded-full shrink-0 ${styles.icon}`}>
                  {insight.type === 'warning' ? <TrendingUp size={18} /> : 
                   insight.type === 'success' ? <TrendingDown size={18} /> : <Info size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{insight.text}</p>
                  <p className="text-xs font-black opacity-60 mt-0.5">{insight.value}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm italic border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            <Info className="w-6 h-6 mb-2 opacity-50" />
            Not enough data for insights yet.
          </div>
        )}
      </div>
    </div>
  );
}