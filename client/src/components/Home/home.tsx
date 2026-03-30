import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { 
  MessageCircle, Zap, ShieldCheck, LayoutGrid, Target, 
  ArrowRight, Check, Wallet, TrendingUp, TrendingDown 
} from 'lucide-react';
import Logo from '../Logo';

const WHATSAPP_NUMBER = "919580813770"; 
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi`;

// --- Scripted conversation data ---
const simulationScript = [
  { text: "200 autos", isSent: true, time: "11:02 AM", delay: 1000 },
  { text: "Noted ₹200 for transport.<br/> recorded ₹200 today.", isSent: false, time: "11:02 AM", delay: 1500 },
  { text: "500 dinner", isSent: true, time: "11:04 AM", delay: 2500 },
  { text: "Got it. ₹500 for food.", isSent: false, time: "11:04 AM", delay: 1200 },
  { text: "summary", isSent: true, time: "11:05 AM", delay: 2000 },
  { text: "<strong>Today: ₹700</strong><br/>Week: ₹4,200", isSent: false, time: "11:05 AM", delay: 1500 },
];
const featureScript = [
  { text: "petrol 250", isSent: true, time: "11:02 AM", delay: 600 },
  { text: "Noted ₹250 for petrol.<br/> recorded ₹250 today.", isSent: false, time: "11:02 AM", delay: 1000 },
  { text: "summary", isSent: true, time: "11:04 AM", delay: 1200 },
  { text: "<strong>Today: ₹250</strong><br/>Week: ₹1250", isSent: false, time: "11:04 AM", delay: 1000 }
];

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [featureMessages, setFeatureMessages] = useState<any[]>([]);
  const featureChatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentTimeout: ReturnType<typeof setTimeout>;
    const showMessage = (index: number) => {
      if (index >= simulationScript.length) {
        currentTimeout = setTimeout(() => {
          setMessages([]);
          showMessage(0);
        }, 2500);
        return;
      }
      setMessages((prev) => [...prev, simulationScript[index]]);
      currentTimeout = setTimeout(() => showMessage(index + 1), simulationScript[index].delay);
    };
    setMessages([]);
    showMessage(0);
    return () => clearTimeout(currentTimeout);
  }, []);

  useEffect(() => {
    let currentTimeout: ReturnType<typeof setTimeout>;
    const showFeatureMessage = (index: number) => {
      if (index >= featureScript.length) {
        currentTimeout = setTimeout(() => {
          setFeatureMessages([]);
          showFeatureMessage(0);
        }, 2500);
        return;
      }
      setFeatureMessages((prev) => [...prev, featureScript[index]]);
      currentTimeout = setTimeout(() => showFeatureMessage(index + 1), featureScript[index].delay);
    };
    setFeatureMessages([]);
    showFeatureMessage(0);
    return () => clearTimeout(currentTimeout);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (featureChatContainerRef.current) featureChatContainerRef.current.scrollTop = featureChatContainerRef.current.scrollHeight;
  }, [featureMessages]);

  return (
    <div className="min-h-screen bg-white font-sans text-[#111111] selection:bg-[#25D366]/30 relative overflow-x-hidden">
      
      {/* --- Navigation --- */}
      <nav className="flex items-center justify-between px-6 py-4 md:py-5 max-w-7xl mx-auto sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <Link to="/" className="flex items-center gap-2.5">
            <Logo variant="app-icon" textSize="text-xl md:text-2xl" />
            <span className="font-extrabold tracking-tight text-xl md:text-2xl text-[#111111] leading-none">
                Side<span className="text-[#25D366]">Note</span>
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How it works</a>
          <a href="#why-sidenote" className="hover:text-[#111111] transition-colors">Why SideNote</a>
          <a href="#demo" className="hover:text-[#111111] transition-colors">Demo</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden md:block text-sm font-bold text-slate-600 hover:text-[#111111]">
            Login
          </Link>
          <a 
            href={WHATSAPP_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm hover:bg-[#1EA952] transition-colors shadow-lg shadow-[#25D366]/20"
          >
            <MessageCircle className="w-4 h-4 fill-current hidden md:block" /> 
            <span className="md:hidden w-2 h-2 bg-white rounded-full"></span> 
            <span className="hidden md:inline">Start Free</span>
            <span className="md:hidden uppercase tracking-wider">WhatsApp</span>
          </a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="max-w-7xl mx-auto px-6 py-10 md:py-24 flex flex-col md:grid md:grid-cols-2 gap-12 items-center text-center md:text-left">
        <div className="max-w-xl relative z-10 flex flex-col items-center md:items-start">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
            Live on WhatsApp
          </div>
          <h1 className="text-4xl md: text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Just send your <br/>
            <span className="text-[#25D366]">expenses</span> like <br/>
            a message.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium mb-8 leading-relaxed max-w-md mx-auto md:mx-0">
            No apps. No categories. No login. <br className="hidden md:block" />
            Just type it and it's recorded.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
            <a 
              href={WHATSAPP_URL} target="_blank" rel="noreferrer"
              className="w-full sm:w-auto flex justify-center items-center gap-2.5 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#1EA952] hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30"
            >
              <MessageCircle className="w-5 h-5 fill-current" /> Start on WhatsApp
            </a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 hover:text-[#111111] flex items-center justify-center gap-1">
              See how it works <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center md:justify-start gap-3">
            <div className="flex -space-x-3">
              {['AK', 'SR', 'PG', 'MN'].map((init, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white opacity-90">
                  {init}
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              <strong className="text-[#111111]">2,400+</strong> people tracking daily
            </p>
          </div>
        </div>

        {/* Right Side: Phone Mockup */}
        <div className="relative flex justify-center md:justify-end w-full mt-8 md:mt-0">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#25D366]/20 blur-[80px] rounded-full pointer-events-none"></div>
           <div className="w-full max-w-[320px] bg-[#EFEAE2] rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200/50 flex flex-col mx-auto shrink-0 relative z-10">
                <div className="bg-[#008069] px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        SN
                    </div>
                    <div className="text-left">
                        <h3 className="text-white font-semibold text-sm leading-tight">SideNote</h3>
                        <p className="text-white/80 text-[11px]">Online</p>
                    </div>
                </div>
                <div ref={chatContainerRef} className="p-4 flex flex-col gap-3 h-[280px] overflow-y-auto relative scroll-smooth no-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 px-3 rounded-xl shadow-sm relative text-[15px] text-[#111111] text-left leading-snug ${
                                msg.isSent ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'
                            }`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                <div className="text-[10px] text-slate-500 text-right mt-1 opacity-80">{msg.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-[#F0F2F5] p-2 px-3 flex items-center gap-2 mt-auto">
                    <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-slate-400 text-left">Type a message</div>
                    <div className="w-10 h-10 bg-[#008069] rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-white fill-white" />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- How it works Section --- */}
      <section id="how-it-works" className="py-20 md:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Three steps. That's it.</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">
              You already know how to send a WhatsApp message. That's all you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { num: 1, title: "Send a message", desc: 'Type "200 chai" or "450 uber" the moment you spend.' },
              { num: 2, title: "It gets recorded instantly", desc: 'Logged in your private ledger — zero extra taps.' },
              { num: 3, title: "See your summary anytime", desc: 'Just type "summary" for today\'s or this week\'s total.' },
            ].map((step) => (
              <div key={step.num} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 text-left">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#111111] text-white rounded-xl flex items-center justify-center text-lg md:text-xl font-bold mb-5 md:mb-6">
                  {step.num}
                </div>
                <h3 className="text-lg md:text-xl font-extrabold mb-2 md:mb-3">{step.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Speed/Features Section --- */}
      <section id="why-sidenote" className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          
          <div className="order-1 md:order-2 text-center md:text-left flex flex-col items-center md:items-start w-full">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4 md:mb-6">
              Built for speed,<br/>not spreadsheets.
            </h2>
            <p className="text-slate-500 font-medium text-base md:text-lg mb-8 md:mb-10 max-w-md">
              Every other tracker asks you to do too much. SideNote gets out of your way.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
               {[
                 { icon: LayoutGrid, text: "No apps to open or update" },
                 { icon: Target, text: "No categories to think about" },
                 { icon: Zap, text: "No forms or login screens" },
                 { icon: ShieldCheck, text: "Just note it and move on" },
               ].map((feature, i) => (
                 <div key={i} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl md:rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                       <feature.icon className="w-5 h-5 text-[#25D366]" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 leading-tight">{feature.text}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="order-2 md:order-1 flex justify-center w-full">
            <div className="bg-[#2D5A4C] p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden flex flex-col w-full max-w-[400px] md:max-w-none shadow-xl">
                <h3 className="text-white font-bold text-base md:text-lg mb-6 md:mb-8 relative z-10 self-start">Feel how fast it is</h3>
                
                <div className="w-full bg-[#EFEAE2] rounded-2xl md:rounded-3xl shadow-lg overflow-hidden border border-slate-200/50 flex flex-col mx-auto relative">
                    <div className="bg-[#008069] px-3 py-2.5 flex items-center gap-3 shadow-sm z-10">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                            SN
                        </div>
                        <div className="text-left">
                            <h3 className="text-white font-semibold text-xs leading-tight">SideNote</h3>
                            <p className="text-white/80 text-[10px]">Online</p>
                        </div>
                    </div>
                    
                    <div ref={featureChatContainerRef} className="p-3 flex flex-col gap-2 h-[220px] md:h-[280px] overflow-y-auto relative no-scrollbar scroll-smooth">
                        {featureMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-2 px-2.5 rounded-lg md:rounded-xl shadow-sm relative text-[13px] md:text-[15px] text-[#111111] text-left leading-snug ${
                                    msg.isSent ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                    <div className="text-[10px] text-slate-500 text-right mt-1 opacity-80">{msg.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#F0F2F5] p-2 flex items-center gap-2 mt-auto">
                        <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400 text-left">
                            Type a message
                        </div>
                        <div className="w-8 h-8 bg-[#008069] rounded-full flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4 text-white fill-white" />
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </section>

      <section id="demo" className="py-20 md:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            
            <div className="order-2 md:order-1 relative w-full max-w-[400px] mx-auto md:max-w-none">
                <div className="flex flex-col gap-4">
                    <div className="bg-[#4338ca] rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                        <div className="flex bg-white/20 p-1 rounded-xl mb-6 max-w-fit">
                            <div className="px-4 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-lg shadow-sm">Day</div>
                            <div className="px-4 py-1.5 text-white text-xs font-bold rounded-lg opacity-90">Week</div>
                            <div className="px-4 py-1.5 text-white text-xs font-bold rounded-lg opacity-90">Month</div>
                            <div className="px-4 py-1.5 text-white text-xs font-bold rounded-lg opacity-90">Year</div>
                        </div>
                        <h4 className="text-4xl md:text-5xl font-extrabold tracking-tight">₹12,450</h4>
                        <div className="absolute right-6 bottom-6 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    {/* Income/Expense Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider">TOTAL INCOME</p>
                            <h4 className="text-2xl font-extrabold text-[#111111]">₹45,000</h4>
                            <div className="mt-3 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider">TOTAL EXPENSES</p>
                            <h4 className="text-2xl font-extrabold text-[#111111]">₹32,550</h4>
                            <div className="mt-3 w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-rose-600" />
                            </div>
                        </div>
                    </div>
                </div>
                <Link 
                    to="/login"
                    className="flex md:hidden mt-8 w-full justify-center items-center gap-3 bg-[#111111] text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                    Login to Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
            </div>

            {/* Dashboard Text - Right side */}
            <div className="order-1 md:order-2 text-center md:text-left flex flex-col items-center md:items-start w-full">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4 md:mb-6">
                    Everything in one<br/>beautiful place.
                </h2>
                <p className="text-slate-500 font-medium text-base md:text-lg mb-8 md:mb-10 max-w-md">
                    Log expenses on WhatsApp, then open your deep dashboard for smart analytics, recurring bills, and budget tracking.
                </p>
                <Link 
                    to="/login"
                    className="hidden md:flex w-auto justify-center items-center gap-3 bg-[#111111] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-black hover:scale-105 transition-all shadow-xl shadow-slate-200"
                >
                    Login to Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-white border-t border-slate-100 text-center px-6">
         <div className="flex justify-center gap-1.5 mb-6">
            {[1,2,3,4,5].map(i => <Check key={i} className="w-5 h-5 text-[#25D366]" strokeWidth={3.5} />)}
         </div>
         <h2 className="text-xl md:text-3xl font-extrabold tracking-tight max-w-2xl mx-auto mb-4 leading-tight">
            "Built for people who want a simple way to track spending without extra effort."
         </h2>
         <p className="text-slate-500 font-medium text-sm md:text-base">Used daily by people who prefer simplicity over apps.</p>
      </section>

      {/* --- Bottom CTA Section --- */}
      <section className="bg-[#111111] py-20 md:py-24 px-6 text-center">
         <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4 md:mb-6">
            Start recording your <br/>
            <span className="text-[#25D366]">spending in seconds.</span>
         </h2>
         <p className="text-slate-400 font-medium text-sm md:text-lg mb-8 md:mb-10 max-w-lg mx-auto">
            No installation. No signup. Just open WhatsApp and send your first expense.
         </p>
         <div className="flex flex-col items-center justify-center gap-4">
            <a 
              href={WHATSAPP_URL} target="_blank" rel="noreferrer"
              className="w-full sm:w-auto flex justify-center items-center gap-3 bg-[#25D366] text-white px-8 py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#1EA952] hover:scale-105 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 fill-current" /> Open WhatsApp
            </a>
            <p className="text-slate-600 text-[10px] md:text-xs font-semibold mt-2 md:mt-4">
              Secure and private. No data sold. Ever.
            </p>
         </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-100 py-8 md:py-12 px-6 bg-white">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <Logo variant="app-icon" textSize="text-lg" />
                <span className="font-extrabold tracking-tight text-lg text-[#111111] leading-none">
                    Side<span className="text-[#25D366]">Note</span>
                </span>
            </div>
            
            <p className="text-slate-400 text-xs font-semibold md:order-2 order-3">
              © {new Date().getFullYear()} SideNote. Track easier.
            </p>
            
            <div className="flex gap-4 md:gap-6 text-xs font-bold text-slate-400 md:order-3 order-2">
               <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How it works</a>
               <a href="#why-sidenote" className="hover:text-[#111111] transition-colors">Why SideNote</a>
               <a href="#demo" className="hover:text-[#111111] transition-colors">Demo</a>
               <Link to="/login" className="hover:text-[#111111] transition-colors">Login</Link>
            </div>
         </div>
      </footer>

    </div>
  );
}