export const FeedSkeleton = () => (
  <div className="space-y-8 animate-pulse pb-24">
    {[1, 2].map((day) => (
      <div key={day}>
        <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] border border-stone-100 dark:border-white/5 overflow-hidden shadow-sm">
          {[1, 2, 3].map((item, idx) => (
            <div key={item} className={`p-4 flex justify-between ${idx !== 2 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 shrink-0 border border-slate-200 dark:border-white/5"></div>
                <div className="space-y-2 mt-1">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                  <div className="h-2 w-20 bg-slate-100 dark:bg-white/5 rounded-full"></div>
                </div>
              </div>
              <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-full mt-1"></div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const BalancesSkeleton = () => (
  <div className="animate-pulse space-y-4 pb-20">
    <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] border border-stone-100 dark:border-white/5 flex justify-between items-center shadow-sm">
           <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                 <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-[#1a1a1a] z-10"></div>
                 <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-white/5 border-2 border-white dark:border-[#1a1a1a] z-0"></div>
              </div>
              <div className="space-y-2">
                 <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                 <div className="h-2 w-16 bg-slate-100 dark:bg-white/5 rounded-full"></div>
              </div>
           </div>
           <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export const SummarySkeleton = () => (
  <div className="animate-pulse pb-20">
    <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
    <div className="bg-white dark:bg-[#1a1a1a] rounded-[1.5rem] border border-stone-100 dark:border-white/5 p-2 shadow-sm">
      {[1, 2, 3, 4].map((i, idx) => (
        <div key={i} className={`flex justify-between items-center p-4 ${idx !== 3 ? 'border-b border-stone-100 dark:border-white/5' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5"></div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded-full"></div>
              <div className="h-2 w-12 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            </div>
          </div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export const MembersSkeleton = () => (
  <div className="animate-pulse space-y-8 pb-20">
    <div>
      <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
      <div className="h-40 bg-slate-100 dark:bg-[#1a1a1a] rounded-[1.5rem] w-full border border-stone-200 dark:border-white/5"></div>
    </div>
    <div>
       <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
       <div className="space-y-3">
         {[1, 2, 3].map(i => (
           <div key={i} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white dark:bg-[#1a1a1a] border border-stone-100 dark:border-white/5 shadow-sm">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/5"></div>
               <div className="space-y-2">
                 <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                 <div className="h-2 w-32 bg-slate-100 dark:bg-white/5 rounded-full"></div>
               </div>
             </div>
             <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded-full"></div>
           </div>
         ))}
       </div>
    </div>
  </div>
);