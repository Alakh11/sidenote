import { useState, useEffect } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import axios from 'axios';
import { 
  Search, MessageSquare, Pencil, AlertCircle, BarChart2, 
  MessageCircle, User, ArrowLeft, ChevronRight, ThumbsUp, ThumbsDown, Sun, Moon, CheckCircle
} from 'lucide-react';
import Logo from '../Logo';
import { useTheme } from '../../context/ThemeContext';
import GlobalLoader from '../GlobalLoader';

interface HelpArticle {
  id: number;
  topic_id: number;
  title: string;
  content: string;
  lastUpdated: string;
}

interface HelpTopic {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  articles: HelpArticle[];
}

export default function HelpCenter() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackState, setFeedbackState] = useState<'yes' | 'no' | 'submitted' | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchHelpData = async () => {
      try {
        const res = await axios.get(`${API_URL}/help/topics`);
        setTopics(res.data);
      } catch (error) {
        console.error("Failed to load help topics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelpData();
  }, [API_URL]);

  const renderIcon = (iconName: string) => {
    const props = { className: "w-6 h-6 text-stone-700 dark:text-slate-200" };
    switch (iconName) {
      case 'MessageSquare': return <MessageSquare {...props} />;
      case 'Pencil': return <Pencil {...props} />;
      case 'AlertCircle': return <AlertCircle {...props} />;
      case 'BarChart2': return <BarChart2 {...props} />;
      case 'MessageCircle': return <MessageCircle {...props} />;
      case 'User': return <User {...props} />;
      default: return <MessageSquare {...props} />;
    }
  };

  const handleContactSupport = () => {
    const token = localStorage.getItem('token');
    if (token) navigate({ to: '/feedback' });
    else navigate({ to: '/login' });
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!selectedArticle || !selectedTopic || feedbackState === 'submitted') return;
    
    setFeedbackState(isHelpful ? 'yes' : 'no');
    const userData = localStorage.getItem('user_data');
    const userId = userData ? JSON.parse(userData).id : null;

    try {
      await axios.post(`${API_URL}/help/feedback`, {
        topic_id: selectedTopic.id,
        article_id: selectedArticle.id,
        is_helpful: isHelpful,
        user_id: userId
      });
      setFeedbackState('submitted');
    } catch (err) {
      console.error("Feedback failed", err);
    }
  };

  const searchResults = searchQuery.trim()
    ? topics.flatMap(topic => 
        topic.articles
          .filter(art => 
            art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            art.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(art => ({ ...art, topic }))
      )
    : [];

  if (loading) return <GlobalLoader />;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-stone-800 dark:text-slate-100 transition-colors duration-300">
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-stone-200 dark:border-slate-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo variant="app-icon" textSize="text-xl" />
          <span className="font-extrabold text-2xl text-[#111111] dark:text-white leading-none tracking-tight">
            Side<span className="text-[#25D366]">Note</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            {theme === 'dark' ? <Sun size={18} className="text-amber-400"/> : <Moon size={18} className="text-indigo-500"/>}
          </button>
          <Link to="/" className="text-sm font-semibold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {selectedArticle && selectedTopic ? (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <nav className="flex items-center gap-2 text-xs md:text-sm font-medium text-stone-400 dark:text-slate-500 mb-8">
              <button onClick={() => { setSelectedTopic(null); setSelectedArticle(null); setFeedbackState(null); }} className="hover:text-stone-700 dark:hover:text-slate-300 transition-colors">Help Center</button>
              <span>/</span>
              <button onClick={() => { setSelectedArticle(null); setFeedbackState(null); }} className="hover:text-stone-700 dark:hover:text-slate-300 transition-colors">{selectedTopic.title}</button>
              <span>/</span>
              <span className="text-stone-800 dark:text-slate-200 font-bold">{selectedArticle.title}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-white mb-2">{selectedArticle.title}</h1>
            <p className="text-xs font-semibold text-stone-400 dark:text-slate-500 mb-8">Last updated {selectedArticle.lastUpdated}</p>

            <div className="prose dark:prose-invert max-w-none text-stone-600 dark:text-slate-300 leading-relaxed text-base whitespace-pre-line mb-12">
              {selectedArticle.content}
            </div>

            <div className="border-t border-b border-stone-200 dark:border-slate-800 py-6 my-8">
              <p className="text-sm font-bold text-stone-800 dark:text-slate-200 mb-3">Was this helpful?</p>
              
              {feedbackState === 'submitted' ? (
                <div className="text-sm font-bold text-[#25D366] flex items-center gap-2">
                  <CheckCircle size={18} /> Thank you for your feedback!
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => handleFeedback(true)} className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800 transition-all">
                    <ThumbsUp size={14} /> Yes
                  </button>
                  <button onClick={() => handleFeedback(false)} className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800 transition-all">
                    <ThumbsDown size={14} /> No
                  </button>
                </div>
              )}
              
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-4">
                Need more help? <button onClick={handleContactSupport} className="font-bold text-[#25D366] hover:underline">Contact Support</button>
              </p>
            </div>

            <button onClick={() => { setSelectedArticle(null); setFeedbackState(null); }} className="text-sm font-bold text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
              <ArrowLeft size={16} /> Back to {selectedTopic.title}
            </button>
          </div>
        ) : selectedTopic ? (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <button onClick={() => setSelectedTopic(null)} className="text-sm font-bold text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1.5 mb-8 transition-colors">
              <ArrowLeft size={16} /> Help Center
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-stone-100 dark:bg-slate-800 rounded-xl">{renderIcon(selectedTopic.icon_name)}</div>
              <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">{selectedTopic.title}</h1>
            </div>

            <p className="text-stone-500 dark:text-slate-400 font-medium text-sm md:text-base mb-8">{selectedTopic.description}</p>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/80 dark:border-slate-800 divide-y divide-stone-100 dark:divide-slate-800/80 shadow-sm overflow-hidden mb-12">
              {selectedTopic.articles.map(article => (
                <button key={article.id} onClick={() => setSelectedArticle(article)} className="w-full p-4 md:p-5 text-left font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50/80 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors group">
                  <span>{article.title}</span>
                  <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs font-black tracking-widest uppercase text-stone-400 dark:text-slate-500">HELP CENTER</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-white mt-1 mb-3">How can we help?</h1>
              <p className="text-stone-500 dark:text-slate-400 text-sm md:text-base font-medium">Find answers, fix an issue, or learn how to get the most out of SideNote.</p>
              <div className="relative mt-6">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-stone-400" />
                <input type="text" placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-[#25D366]/30 font-medium text-sm transition-all shadow-sm" />
              </div>
            </div>

            {searchQuery.trim() ? (
              <div className="max-w-2xl mx-auto mb-16">
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Search Results ({searchResults.length})</h2>
                {searchResults.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 divide-y divide-stone-100 dark:divide-slate-800 shadow-sm overflow-hidden">
                    {searchResults.map(res => (
                      <button key={res.id} onClick={() => { setSelectedTopic(res.topic); setSelectedArticle(res); }} className="w-full p-4 text-left hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                        <div>
                          <p className="font-bold text-stone-800 dark:text-slate-200">{res.title}</p>
                          <p className="text-xs text-stone-400 font-medium mt-0.5">{res.topic.title}</p>
                        </div>
                        <ChevronRight size={18} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-stone-500 font-medium text-sm">No articles found matching "{searchQuery}"</p>
                )}
              </div>
            ) : (
              <div className="mb-16">
                <h2 className="text-lg md:text-xl font-extrabold text-stone-900 dark:text-white mb-6">Browse help topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {topics.map(topic => (
                    <div key={topic.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-stone-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-stone-100 dark:bg-slate-800/80 rounded-xl">{renderIcon(topic.icon_name)}</div>
                          <h3 className="font-extrabold text-base md:text-lg text-stone-900 dark:text-white">{topic.title}</h3>
                        </div>
                        <p className="text-xs md:text-sm text-stone-500 dark:text-slate-400 font-medium mb-4 leading-relaxed">{topic.description}</p>
                        <ul className="space-y-2.5 mb-6">
                          {topic.articles.slice(0, 3).map(art => (
                            <li key={art.id}>
                              <button onClick={() => { setSelectedTopic(topic); setSelectedArticle(art); }} className="text-xs md:text-sm font-semibold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white text-left transition-colors">
                                {art.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button onClick={() => setSelectedTopic(topic)} className="text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors self-start">
                        View all →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-stone-200 dark:border-slate-800 pt-12 text-center">
              <span className="text-xs font-black tracking-widest uppercase text-stone-400 dark:text-slate-500">SUPPORT</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white mt-1 mb-2">Still need help?</h2>
              <p className="text-stone-500 dark:text-slate-400 font-medium text-sm mb-6">Can't find what you're looking for? We're here to help.</p>
              <button onClick={handleContactSupport} className="px-6 py-3 bg-[#111111] dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:bg-black dark:hover:bg-slate-200 transition-colors shadow-md">
                Contact Support
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}