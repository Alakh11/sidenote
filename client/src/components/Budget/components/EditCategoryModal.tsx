import { useState } from 'react';
import axios from 'axios';
import { useRouter } from '@tanstack/react-router';
import { X, Save } from 'lucide-react';

export default function EditCategoryModal({ category, onClose }: { category: any, onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);

  const handleUpdate = async () => {
    try {
      await axios.put(`https://api.sidenote.in/categories/${category.category_id}`, {
        name,
        icon,
        color: category.color,
        type: 'expense'
      });
      router.invalidate();
      onClose();
    } catch (err) { alert("Failed to update"); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold dark:text-white">Edit Category</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        
        <div className="space-y-4">
            <input 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white font-bold"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Category Name"
            />
            <input 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-2xl text-center"
                value={icon} onChange={e => setIcon(e.target.value)}
                placeholder="Icon (Emoji)"
            />
            <button 
                onClick={handleUpdate}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
            >
                <Save size={18} /> Save Changes
            </button>
        </div>
      </div>
    </div>
  );
}