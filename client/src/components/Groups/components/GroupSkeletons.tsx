export const FeedSkeleton = () => (
  <div className="space-y-6 animate-pulse pb-20">
    {[1, 2].map((day) => (
      <div key={day}>
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white dark:bg-[#252525] rounded-2xl p-4 border border-stone-100 dark:border-white/5 flex justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                <div className="space-y-2 mt-1">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
                </div>
              </div>
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const BalancesSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-16 bg-slate-100 dark:bg-[#252525] rounded-2xl"></div>
    ))}
  </div>
);