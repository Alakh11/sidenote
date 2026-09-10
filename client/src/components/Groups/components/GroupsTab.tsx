interface GroupTabsProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSplit: boolean;
}

export default function GroupTabs({ activeTab, setActiveTab, isSplit }: GroupTabsProps) {
  const tabs = ['Feed'];
  if (isSplit) tabs.push('Balances');
  tabs.push('Summary', 'Members');

  return (
    <div className="mb-6 flex justify-center sm:justify-start">
      <div className="inline-flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl border border-stone-200 dark:border-white/5 w-full sm:w-auto overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.toLowerCase()
                ? 'bg-white dark:bg-[#2a2a2a] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}