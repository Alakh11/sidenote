import { Plus, Edit, Key, Save } from 'lucide-react';

export default function UserFormModal({ isCreating, editingUser, formData, setFormData, onClose, onSave, isSuperAdmin }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-stone-100 dark:border-slate-800">
            
            <h3 className="text-xl font-bold mb-6 text-stone-800 dark:text-white flex items-center gap-2">
                {isCreating ? <><Plus size={20} className="text-indigo-600"/> Create New User</> : <><Edit size={20} className="text-amber-500"/> Edit User #{editingUser?.id}</>}
            </h3>
            
            <div className="space-y-4">
                {isSuperAdmin && (
                  <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-stone-400 ml-1">Account Role</label>
                      <select 
                          className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none cursor-pointer" 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                          <option value="user">Standard User</option>
                          <option value="admin">Administrator</option>
                      </select>
                  </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Full Name</label>
                    <input className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Email Address</label>
                    <input type="email" className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email Id" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">Mobile Number</label>
                    <input type="tel" className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="Mobile Number" />
                </div>
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold uppercase text-stone-400 ml-1">{isCreating ? "Password" : "New Password (Optional)"}</label>
                    <input className="w-full p-3.5 pr-10 bg-stone-50 border border-stone-200 rounded-xl dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <Key className="absolute right-4 top-9 text-stone-400" size={16} />
                </div>
            </div>
            
            <div className="flex gap-3 mt-8">
                <button onClick={onClose} className="flex-1 py-3.5 bg-stone-100 rounded-xl font-bold text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300">Cancel</button>
                <button onClick={onSave} className="flex-1 py-3.5 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Save size={18} /> Save
                </button>
            </div>
        </div>
    </div>
  );
}