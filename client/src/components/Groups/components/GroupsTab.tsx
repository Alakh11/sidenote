export default function GroupTabs({ activeTab, setActiveTab, isSplit }: any) {
  const tabs = ['Feed'];
  if (isSplit) tabs.push('Balances');
  tabs.push('Summary', 'Members');

  return (
    <div className="flex gap-2 mb-6 border-b border-stone-100 dark:border-slate-800/50 pb-4 overflow-x-auto custom-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab.toLowerCase())}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border ${
            activeTab === tab.toLowerCase()
              ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
              : 'bg-transparent text-slate-600 border-slate-200 hover:border-slate-300 dark:text-slate-400 dark:border-slate-700/50 dark:hover:border-slate-600'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}