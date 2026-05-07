import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Wallet } from 'lucide-react';

interface Props {
  categories: any[];
  onAdd: (tx: any) => Promise<void>;
  isSubmitting: boolean;
}

export default function QuickAddForm({ categories, onAdd, isSubmitting }: Props) {
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'expense',
    category: '',
    payment_mode: 'UPI',
    note: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false
  });

  const [errors, setErrors] = useState({ amount: '', category: '', note: '' });
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);

  // Custom Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateView, setDateView] = useState<'days' | 'months' | 'years'>('days');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow only numbers and a single decimal
    if (val && !/^\d*\.?\d{0,2}$/.test(val)) return;
    // Limit to 10 Lakhs (1,000,000)
    if (Number(val) > 1000000) return;
    
    setNewTx({ ...newTx, amount: val });
    if (errors.amount) setErrors({ ...errors, amount: '' });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Prevent consecutive spaces
    val = val.replace(/\s{2,}/g, ' ');
    // Max 50 characters (excluding spaces)
    const charCountWithoutSpaces = val.replace(/\s/g, '').length;
    if (charCountWithoutSpaces > 50) return;

    setNewTx({ ...newTx, note: val });
    if (errors.note) setErrors({ ...errors, note: '' });
  };

  const handleRecurringToggle = () => {
    setIsRecurringLoading(true);
    setTimeout(() => {
        setNewTx({...newTx, is_recurring: !newTx.is_recurring});
        setIsRecurringLoading(false);
    }, 200);
  };

  const handleSubmit = async () => {
    let newErrors = { amount: '', category: '', note: '' };
    let hasError = false;

    if (!newTx.amount) { newErrors.amount = 'Please enter amount'; hasError = true; }
    if (!newTx.category) { newErrors.category = 'Please select category'; hasError = true; }
    if (!newTx.note.trim()) { newErrors.note = 'Please enter description'; hasError = true; }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    await onAdd(newTx);
    setNewTx({ ...newTx, amount: '', note: '', category: '', payment_mode: 'UPI', is_recurring: false });
    setErrors({ amount: '', category: '', note: '' });
  };

  const filteredCats = categories.filter((c: any) => c.type === newTx.type);
  
  const inputContainer = "relative w-full";
  const inputClasses = "w-full h-[46px] px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-slate-800 dark:text-slate-100 text-sm font-semibold placeholder:text-slate-400 placeholder:font-medium appearance-none";
  const labelClasses = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1";
  const errorClasses = "absolute -bottom-5 left-1 text-[11px] font-bold text-rose-500 flex items-center gap-1 whitespace-nowrap";

  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({length: 12}, (_, i) => calendarDate.getFullYear() - 5 + i);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 h-fit transition-colors duration-300">
      
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Wallet className="w-5 h-5" />
        </div>
        <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white leading-none tracking-tight">New Entry</h2>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => { setNewTx({ ...newTx, type: 'income', category: '' }); setErrors({...errors, category: ''}); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                newTx.type === 'income' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => { setNewTx({ ...newTx, type: 'expense', category: '' }); setErrors({...errors, category: ''}); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                newTx.type === 'expense' 
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Expense
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
            <div className={inputContainer}>
                <label className={labelClasses}>Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className={`${inputClasses} pl-8 text-base tracking-wide`}
                        value={newTx.amount}
                        onChange={handleAmountChange}
                    />
                </div>
                {errors.amount && <p className={errorClasses}><AlertCircle className="w-3 h-3" />{errors.amount}</p>}
            </div>
            
            <div className={inputContainer}>
                <label className={labelClasses}>Payment Mode</label>
                <div className="relative">
                    <select 
                        value={newTx.payment_mode} 
                        onChange={e => setNewTx({ ...newTx, payment_mode: e.target.value })}
                        className={`${inputClasses} pr-10 cursor-pointer`}
                    >
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Net Banking">Net Banking</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
            <div className={inputContainer}>
                <label className={labelClasses}>Category</label>
                <div className="relative">
                    <select 
                        value={newTx.category} 
                        onChange={e => { setNewTx({ ...newTx, category: e.target.value }); if(errors.category) setErrors({...errors, category: ''}); }}
                        className={`${inputClasses} pr-10 cursor-pointer ${!newTx.category ? 'text-slate-400' : ''}`}
                    >
                        <option value="" disabled>Select category</option>
                        {filteredCats.map((c: any) => (
                            <option key={c.id} value={c.name} className="text-slate-800 dark:text-slate-200">{c.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                </div>
                {errors.category && <p className={errorClasses}><AlertCircle className="w-3 h-3" />{errors.category}</p>}
            </div>

            <div className={inputContainer} ref={datePickerRef}>
                <label className={labelClasses}>Date</label>
                <button 
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className={`${inputClasses} flex items-center justify-between text-left gap-2`}
                >
                    <span className="truncate whitespace-nowrap">
                        {new Date(newTx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {isDatePickerOpen && (
                    <div className="absolute top-[70px] left-0 w-full sm:w-[280px] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-200">
                        
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setDateView(dateView === 'days' ? 'months' : dateView === 'months' ? 'years' : 'days')}
                                className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1 rounded-lg transition"
                            >
                                {dateView === 'days' ? `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}` : dateView === 'months' ? calendarDate.getFullYear() : `${years[0]} - ${years[years.length-1]}`}
                            </button>
                            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {dateView === 'days' && (
                            <>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                        <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isSelected = newTx.date === dateStr;
                                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => { setNewTx({ ...newTx, date: dateStr }); setIsDatePickerOpen(false); }}
                                                className={`h-8 w-full rounded-lg text-xs font-bold transition-all ${
                                                    isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                                                    : isToday ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {dateView === 'months' && (
                            <div className="grid grid-cols-3 gap-2">
                                {monthNames.map((month, index) => (
                                    <button 
                                        key={month}
                                        onClick={() => { setCalendarDate(new Date(calendarDate.getFullYear(), index, 1)); setDateView('days'); }}
                                        className="py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        )}

                        {dateView === 'years' && (
                            <div className="grid grid-cols-3 gap-2">
                                {years.map((year) => (
                                    <button 
                                        key={year}
                                        onClick={() => { setCalendarDate(new Date(year, calendarDate.getMonth(), 1)); setDateView('months'); }}
                                        className="py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className={inputContainer}>
            <div className="flex justify-between items-end mb-1.5 ml-1">
                 <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0">Description</label>
                 <span className="text-[10px] font-bold text-slate-400">{newTx.note.replace(/\s/g, '').length}/50</span>
            </div>
            <input
                type="text"
                placeholder="What was this for?"
                className={inputClasses}
                value={newTx.note}
                onChange={handleNoteChange}
            />
            {errors.note && <p className={errorClasses}><AlertCircle className="w-3 h-3" />{errors.note}</p>}
        </div>

        <div 
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none group ${
                newTx.is_recurring 
                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
                : 'bg-transparent border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            onClick={handleRecurringToggle}
        >
            <div className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                isRecurringLoading ? 'border-indigo-400 bg-transparent' :
                newTx.is_recurring 
                ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 scale-100' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-slate-400'
            }`}>
                {isRecurringLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                ) : newTx.is_recurring ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                ) : null}
            </div>

            <div>
                <span className={`text-sm font-bold block leading-tight mb-0.5 ${
                    newTx.is_recurring ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                }`}>
                    Monthly Recurring
                </span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                    Auto-adds on this date
                </span>
            </div>
        </div>

        <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-[52px] bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm tracking-wide hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
        >
            {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save Transaction'}
        </button>
      </div>
    </div>
  );
}