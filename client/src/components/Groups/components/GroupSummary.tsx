import { usePreferences } from '../../../context/PreferencesContext';

export default function GroupSummary({ transactions }: any) {
  const { currency } = usePreferences();

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center text-slate-500 mt-10 animate-in fade-in">
        No data available to summarize yet.
      </div>
    );
  }

  const categories: Record<string, number> = {};
  transactions.forEach((t: any) => {
    const cat = t.description.split(' ')[0];
    const categoryName = cat.charAt(0).toUpperCase() + cat.slice(1);
    categories[categoryName] = (categories[categoryName] || 0) + parseFloat(t.amount);
  });

  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  return (
    <div className="animate-in fade-in">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 pl-1">This month by category</h3>
      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-stone-100 dark:border-white/5 p-2">
        {sortedCategories.map(([cat, amount], index) => (
          <div 
            key={cat} 
            className={`flex justify-between items-center p-4 ${index !== sortedCategories.length - 1 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {cat.toLowerCase() === 'groceries' ? '🛒' : cat.toLowerCase() === 'electricity' ? '⚡' : cat.toLowerCase() === 'food' ? '🍽️' : cat.toLowerCase() === 'fuel' ? '⛽' : '🏷️'}
              </span>
              <span className="font-bold text-slate-800 dark:text-white">{cat}</span>
            </div>
            <div className="font-bold text-slate-800 dark:text-white">
              {currency}{amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}