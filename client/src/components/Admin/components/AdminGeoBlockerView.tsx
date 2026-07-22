// src/components/AdminGeoBlockerView.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Plus, Trash2, Edit, CheckCircle2, XCircle, ShieldAlert, X } from 'lucide-react';

const API_URL = "https://api.sidenote.in";

interface Country {
    id: number;
    country_code: string;
    country_name: string;
    status: number;
    created_at: string;
    updated_at: string;
}

export default function AdminGeoBlockerView() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCountry, setEditingCountry] = useState<Country | null>(null);
    const [formData, setFormData] = useState({ country_code: '', country_name: '', status: 1 });

    const fetchCountries = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/countries`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCountries(res.data);
        } catch (error) {
            console.error("Failed to fetch countries", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            
            // Auto-strip any '+' sign from the input just in case
            const payload = { ...formData, country_code: formData.country_code.replace('+', '') };

            if (editingCountry) {
                await axios.put(`${API_URL}/admin/countries/${editingCountry.id}`, payload, config);
            } else {
                await axios.post(`${API_URL}/admin/countries`, payload, config);
            }
            
            setShowModal(false);
            setEditingCountry(null);
            setFormData({ country_code: '', country_name: '', status: 1 });
            fetchCountries();
        } catch (error: any) {
            alert(error.response?.data?.detail || "Operation failed. Check if country code already exists.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to remove this country from the allowed list? Users from this country will instantly be blocked.")) return;
        try {
            await axios.delete(`${API_URL}/admin/countries/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchCountries();
        } catch (error) {
            console.error("Failed to delete country");
        }
    };

    const handleToggleStatus = async (country: Country) => {
        try {
            const newStatus = country.status === 1 ? 0 : 1;
            await axios.put(`${API_URL}/admin/countries/${country.id}`, {
                country_code: country.country_code,
                country_name: country.country_name,
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchCountries();
        } catch (error) {
            console.error("Failed to toggle status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 md:p-8">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="text-indigo-600" /> Geo Blocker Access
                        </h3>
                        <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
                            Control which country codes are allowed to register and use the WhatsApp bot.
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingCountry(null);
                            setFormData({ country_code: '', country_name: '', status: 1 });
                            setShowModal(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 shrink-0 text-sm"
                    >
                        <Plus size={18} /> Add Country
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-stone-50 dark:bg-slate-800/50 text-stone-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4 rounded-l-xl">Country</th>
                                    <th className="p-4">Prefix Code</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 rounded-r-xl text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                                {countries.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-stone-500 font-bold">No countries configured. All traffic will be blocked.</td></tr>
                                ) : (
                                    countries.map(country => (
                                        <tr key={country.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-bold text-stone-800 dark:text-white flex items-center gap-2">
                                                <MapPin size={16} className="text-stone-400"/> {country.country_name}
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 px-2 py-1 rounded font-bold">
                                                    +{country.country_code}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    onClick={() => handleToggleStatus(country)}
                                                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition ${country.status === 1 ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-rose-100 hover:text-rose-700' : 'text-stone-600 bg-stone-100 dark:bg-slate-800 dark:text-slate-400 hover:bg-emerald-100 hover:text-emerald-700'}`}
                                                    title="Click to toggle status"
                                                >
                                                    {country.status === 1 ? <><CheckCircle2 size={12}/> Active</> : <><XCircle size={12}/> Inactive</>}
                                                </button>
                                            </td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button onClick={() => {
                                                    setEditingCountry(country);
                                                    setFormData({ country_code: country.country_code, country_name: country.country_name, status: country.status });
                                                    setShowModal(true);
                                                }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 shrink-0" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(country.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 shrink-0" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-stone-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-stone-800 dark:text-white">{editingCountry ? 'Edit Country' : 'Add Allowed Country'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 bg-stone-100 dark:bg-slate-800 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-600 dark:text-slate-300 mb-1.5">Country Name</label>
                                <input 
                                    required placeholder="e.g., India"
                                    className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium dark:text-white"
                                    value={formData.country_name} onChange={e => setFormData({...formData, country_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 dark:text-slate-300 mb-1.5">Country Calling Code</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">+</span>
                                    <input 
                                        required placeholder="91" type="number"
                                        className="w-full pl-8 pr-4 py-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono dark:text-white"
                                        value={formData.country_code} onChange={e => setFormData({...formData, country_code: e.target.value.replace(/\D/g, '')})}
                                    />
                                </div>
                                <p className="text-xs text-stone-400 mt-1 font-medium">Do not include the + sign. Just the numbers (e.g., 91, 1, 44).</p>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-slate-700 transition">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">{editingCountry ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}