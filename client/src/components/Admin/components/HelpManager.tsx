import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, X, BookOpen, Layers
} from 'lucide-react';
import GlobalLoader from '../../GlobalLoader';

interface HelpArticle {
  id: number;
  topic_id: number;
  title: string;
  content: string;
  status: number;
}

interface HelpTopic {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  status: number;
  articles: HelpArticle[];
}

export default function HelpManager() {
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<number[]>([]);

  // Modal States
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  
  // Form States
  const [editingTopic, setEditingTopic] = useState<Partial<HelpTopic> | null>(null);
  const [editingArticle, setEditingArticle] = useState<Partial<HelpArticle> | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;
  
  // Get Auth Config
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/help/admin/topics`, getAuthConfig());
      setTopics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch help topics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const toggleTopic = (id: number) => {
    setExpandedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // --- TOPIC ACTIONS ---
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTopic?.id) {
        await axios.put(`${API_URL}/help/admin/topics/${editingTopic.id}`, editingTopic, getAuthConfig());
      } else {
        await axios.post(`${API_URL}/help/admin/topics`, { ...editingTopic, status: editingTopic?.status ?? 1 }, getAuthConfig());
      }
      setIsTopicModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save topic.");
    }
  };

  const handleDeleteTopic = async (id: number) => {
    if (!window.confirm("Are you sure? This will delete the topic and ALL its articles!")) return;
    try {
      await axios.delete(`${API_URL}/help/admin/topics/${id}`, getAuthConfig());
      fetchTopics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete topic.");
    }
  };

  // --- ARTICLE ACTIONS ---
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArticle?.id) {
        await axios.put(`${API_URL}/help/admin/articles/${editingArticle.id}`, editingArticle, getAuthConfig());
      } else {
        await axios.post(`${API_URL}/help/admin/articles`, { ...editingArticle, status: editingArticle?.status ?? 1 }, getAuthConfig());
      }
      setIsArticleModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save article.");
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    try {
      await axios.delete(`${API_URL}/help/admin/articles/${id}`, getAuthConfig());
      fetchTopics();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete article.");
    }
  };

  if (loading) return <GlobalLoader />;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-[#25D366]" /> Help Center Manager
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">Manage public topics and articles</p>
        </div>
        <button 
          onClick={() => { setEditingTopic({ icon_name: 'MessageSquare', status: 1 }); setIsTopicModalOpen(true); }}
          className="bg-[#111111] dark:bg-[#25D366] text-white py-2 px-4 rounded-xl font-bold hover:bg-black dark:hover:bg-[#1EA952] transition flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add New Topic
        </button>
      </div>

      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl mb-6 text-sm font-bold">{error}</div>}

      <div className="space-y-4">
        {topics.map(topic => (
          <div key={topic.id} className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between bg-stone-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleTopic(topic.id)}>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <Layers size={18} className="text-stone-600 dark:text-slate-300" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 dark:text-slate-200 flex items-center gap-2">
                    {topic.title}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${topic.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                      {topic.status === 1 ? 'Active' : 'Hidden'}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-1">{topic.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => { setEditingTopic(topic); setIsTopicModalOpen(true); }} className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"><Edit2 size={16} /></button>
                <button onClick={() => handleDeleteTopic(topic.id)} className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"><Trash2 size={16} /></button>
                <button onClick={() => toggleTopic(topic.id)} className="p-2 text-stone-400">
                  {expandedTopics.includes(topic.id) ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                </button>
              </div>
            </div>

            {expandedTopics.includes(topic.id) && (
              <div className="p-4 border-t border-stone-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase text-stone-400">Articles ({topic.articles.length})</h4>
                  <button onClick={() => { setEditingArticle({ topic_id: topic.id, status: 1 }); setIsArticleModalOpen(true); }} className="text-xs font-bold text-[#25D366] hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add Article
                  </button>
                </div>

                {topic.articles.length === 0 ? (
                  <p className="text-sm text-stone-500 italic py-2">No articles in this topic yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topic.articles.map(art => (
                      <div key={art.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-slate-800/40 rounded-xl border border-stone-100 dark:border-slate-800/80">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-700 dark:text-slate-300 flex items-center gap-2">
                            {art.title}
                            {art.status === 0 && <span className="text-[10px] bg-stone-200 text-stone-500 px-1.5 rounded">Hidden</span>}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingArticle(art); setIsArticleModalOpen(true); }} className="text-stone-400 hover:text-blue-500"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteArticle(art.id)} className="text-stone-400 hover:text-rose-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- TOPIC MODAL --- */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{editingTopic?.id ? 'Edit Topic' : 'Add Topic'}</h2>
              <button onClick={() => setIsTopicModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Title</label>
                <input required type="text" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white" value={editingTopic?.title || ''} onChange={e => setEditingTopic({...editingTopic, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Description</label>
                <input required type="text" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white" value={editingTopic?.description || ''} onChange={e => setEditingTopic({...editingTopic, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Icon Name (Lucide)</label>
                <input required type="text" placeholder="e.g. MessageSquare, Pencil, AlertCircle" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white" value={editingTopic?.icon_name || ''} onChange={e => setEditingTopic({...editingTopic, icon_name: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="t-status" checked={editingTopic?.status === 1} onChange={e => setEditingTopic({...editingTopic, status: e.target.checked ? 1 : 0})} className="w-4 h-4 text-[#25D366] rounded focus:ring-[#25D366]" />
                <label htmlFor="t-status" className="text-sm font-bold text-stone-700 dark:text-slate-300">Active (Visible to public)</label>
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-[#111111] dark:bg-[#25D366] text-white font-bold rounded-xl hover:bg-black transition shadow-lg">Save Topic</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ARTICLE MODAL --- */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">{editingArticle?.id ? 'Edit Article' : 'Add Article'}</h2>
              <button onClick={() => setIsArticleModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Article Title</label>
                <input required type="text" className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white" value={editingArticle?.title || ''} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Content (Supports line breaks)</label>
                <textarea required rows={10} className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-[#25D366]/30 dark:text-white resize-none" value={editingArticle?.content || ''} onChange={e => setEditingArticle({...editingArticle, content: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="a-status" checked={editingArticle?.status === 1} onChange={e => setEditingArticle({...editingArticle, status: e.target.checked ? 1 : 0})} className="w-4 h-4 text-[#25D366] rounded focus:ring-[#25D366]" />
                <label htmlFor="a-status" className="text-sm font-bold text-stone-700 dark:text-slate-300">Active (Visible to public)</label>
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-[#111111] dark:bg-[#25D366] text-white font-bold rounded-xl hover:bg-black transition shadow-lg">Save Article</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}