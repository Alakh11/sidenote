import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquareText, MessageCircle, Zap, ShieldCheck, LayoutGrid, Target, ArrowRight } from 'lucide-react';

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

// --- Modern Logo with Two-Tone Text ---
const ModernLogo = ({ textSize = "text-2xl" }: { textSize?: string }) => (
    <div className={`flex items-center gap-[0.3em] font-extrabold tracking-tight ${textSize}`}>
      {/* Icon Box from Brand Sheet */}
      <div className="flex items-center justify-center w-[1.3em] h-[1.3em] bg-[#25D366]/15 rounded-[0.3em] shrink-0">
         <MessageSquareText className="w-[60%] h-[60%] text-[#25D366]" strokeWidth={2.5} />
      </div>
      
      {/* Two-tone Text */}
      <div className="font-extrabold">
        <span className="text-[#111111]">Side</span>
        <span className="text-[#25D366]">Note</span>
      </div>
    </div>
);


export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- Runs the conversation simulation loop ---
  useEffect(() => {
    let currentTimeout: NodeJS.Timeout;
    
    // Recursive function to show messages with delays
    const showMessage = (index: number) => {
      if (index >= simulationScript.length) {
        // Conversation finished. Wait 5 seconds, clear, and restart.
        currentTimeout = setTimeout(() => {
          setMessages([]);
          showMessage(0);
        }, 5000);
        return;
      }

      setMessages((prev) => [...prev, simulationScript[index]]);
      
      currentTimeout = setTimeout(() => {
        showMessage(index + 1);
      }, simulationScript[index].delay);
    };

    // Initial clear and start
    setMessages([]);
    showMessage(0);

    // Cleanup on unmount
    return () => clearTimeout(currentTimeout);
  }, []);

  // --- Auto-scrolls chat to bottom when new messages arrive ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-white font-sans text-[#111111] selection:bg-[#25D366]/30 relative overflow-x-hidden">
      
      {/* --- Navigation --- */}
      <nav className="flex items-center justify-between px-6 py-4 md:py-5 max-w-7xl mx-auto sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <ModernLogo />
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How it works</a>
          <a href="#why-sidenote" className="hover:text-[#111111] transition-colors">Why SideNote</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-[#111111]">
            Login
          </Link>
          <a 
            href={WHATSAPP_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#1EA952] transition-colors shadow-lg shadow-[#25D366]/20"
          >
            <MessageCircle className="w-4 h-4 fill-current" /> Start Free
          </a>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Content (Stable) */}
        <div className="max-w-xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
            Live on WhatsApp
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Just send your <br/>
            <span className="text-[#25D366]">expenses</span> like <br/>
            a message.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-medium mb-8 leading-relaxed max-w-md">
            No apps. No categories. No login. <br className="hidden md:block" />
            Just type it and it's recorded.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <a 
              href={WHATSAPP_URL} target="_blank" rel="noreferrer"
              className="w-full sm:w-auto flex justify-center items-center gap-2.5 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#1EA952] hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30"
            >
              <MessageCircle className="w-5 h-5 fill-current" /> Start on WhatsApp
            </a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-600 hover:text-[#111111] flex items-center gap-1">
              See how it works <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-10 flex items-center gap-3">
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

        {/* Right Side: Phone Mockup (Stable Container, Running Content) */}
        <div className="relative flex justify-center md:justify-end">
           {/* Decorative background blob */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#25D366]/20 blur-[80px] rounded-full pointer-events-none"></div>
           
           {/* The WhatsApp Phone Mockup - Fixed height, internally scrolling messages */}
           <div className="w-full max-w-[320px] bg-[#EFEAE2] rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 flex flex-col mx-auto shrink-0 relative z-10">
                {/* WhatsApp Header */}
                <div className="bg-[#008069] px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        SN
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm leading-tight">SideNote</h3>
                        <p className="text-white/80 text-xs">Online</p>
                    </div>
                </div>
                
                {/* Chat Area - Fixed 280px height to prevent screen movement */}
                <div ref={chatContainerRef} className="p-4 flex flex-col gap-3 h-[280px] overflow-y-auto relative scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 px-3 rounded-xl shadow-sm relative text-[15px] text-[#111111] ${
                                msg.isSent 
                                ? 'bg-[#D9FDD3] rounded-tr-none' 
                                : 'bg-white rounded-tl-none'
                            }`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                <div className="text-[10px] text-slate-500 text-right mt-1 opacity-80">
                                {msg.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="bg-[#F0F2F5] p-2 px-3 flex items-center gap-2 mt-auto">
                    <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-slate-400">
                        Type a message
                    </div>
                    <div className="w-10 h-10 bg-[#008069] rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-white fill-white" />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- How it works Section --- */}
      <section id="how-it-works" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Three steps. That's it.</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">
              You already know how to send a WhatsApp message. That's all you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: 1, title: "Send a message", desc: 'Type "200 chai" or "450 uber" the moment you spend.' },
              { num: 2, title: "It gets recorded instantly", desc: 'Logged in your private ledger — zero extra taps.' },
              { num: 3, title: "See your summary anytime", desc: 'Just type "summary" for today\'s or this week\'s total.' },
            ].map((step) => (
              <div key={step.num} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-[#111111] text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6">
                  {step.num}
                </div>
                <h3 className="text-xl font-extrabold mb-3">{step.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Speed/Features Section --- */}
      <section id="why-sidenote" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          
          <div className="order-2 md:order-1 flex justify-center">
            <div className="bg-[#125A46] p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden flex flex-col">
                <h3 className="text-white font-bold text-lg mb-8 relative z-10 self-start">Feel how fast it is</h3>
                
                {/* The static WhatsApp Phone Mockup for Features */}
                <div className="w-full max-w-[320px] bg-[#EFEAE2] rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 flex flex-col mx-auto shrink-0 relative">
                    {/* WhatsApp Header */}
                    <div className="bg-[#008069] px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                            SN
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm leading-tight">SideNote</h3>
                            <p className="text-white/80 text-xs">Online</p>
                        </div>
                    </div>
                    
                    {/* Chat Area - Fixed 280px height */}
                    <div className="p-4 flex flex-col gap-3 h-[280px] overflow-hidden relative">
                        {[
                            { text: "petrol 250", isSent: true, time: "11:02 AM" },
                            { text: "Noted ₹250 for petrol.<br/> recorded ₹250 today.", isSent: false, time: "11:02 AM" },
                            { text: "summary", isSent: true, time: "11:04 AM" },
                            { text: "<strong>Today: ₹250</strong><br/>Week: ₹1250", isSent: false, time: "11:04 AM" }
                        ].map((msg, i) => (
                            <div key={i} className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-2 px-3 rounded-xl shadow-sm relative text-[15px] text-[#111111] ${
                                    msg.isSent 
                                    ? 'bg-[#D9FDD3] rounded-tr-none' 
                                    : 'bg-white rounded-tl-none'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                    <div className="text-[10px] text-slate-500 text-right mt-1 opacity-80">
                                    {msg.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#F0F2F5] p-2 px-3 flex items-center gap-2 mt-auto">
                        <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-slate-400">
                            Type a message
                        </div>
                        <div className="w-10 h-10 bg-[#008069] rounded-full flex items-center justify-center shrink-0">
                            <MessageCircle className="w-5 h-5 text-white fill-white" />
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6">
              Built for speed,<br/>not spreadsheets.
            </h2>
            <p className="text-slate-500 font-medium text-lg mb-10 max-w-md">
              Every other tracker asks you to do too much. SideNote gets out of your way.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
               {[
                 { icon: LayoutGrid, text: "No apps to open or update" },
                 { icon: Target, text: "No categories to think about" },
                 { icon: Zap, text: "No forms or login screens" },
                 { icon: ShieldCheck, text: "Just note it and move on" },
               ].map((feature, i) => (
                 <div key={i} className="feature-card flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                       <feature.icon className="w-5 h-5 text-[#25D366]" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 leading-tight">{feature.text}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- Testimonial Section --- */}
      <section className="py-24 bg-slate-50 border-y border-slate-100 text-center px-6">
         <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight max-w-3xl mx-auto mb-4 leading-tight">
            "Built for people who want a simple way to track spending without extra effort."
         </h2>
         <p className="text-slate-500 font-medium italic">"A simple tool I can trust and use daily."</p>
      </section>

      {/* --- Bottom CTA Section --- */}
      <section className="bg-[#111111] py-24 px-6 text-center">
         <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Start recording your <br/>
            <span className="text-[#25D366]">spending in seconds.</span>
         </h2>
         <p className="text-slate-400 font-medium text-lg mb-10">
            No installation. No signup. Just open WhatsApp and send your first expense.
         </p>
         <div className="flex flex-col items-center justify-center gap-4">
            <a 
              href={WHATSAPP_URL} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#1EA952] hover:scale-105 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle className="w-6 h-6 fill-current" /> Open WhatsApp
            </a>
            <p className="text-slate-600 text-xs font-semibold mt-4">
              Secure and private. No data sold. Ever.
            </p>
         </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-100 py-8 md:py-12 px-6 bg-white">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <ModernLogo textSize="text-xl" />
            <p className="text-slate-400 text-xs font-semibold">
              © {new Date().getFullYear()} SideNote. Track easier.
            </p>
            <div className="flex gap-6 text-xs font-bold text-slate-400">
               <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How it works</a>
               <a href="#why-sidenote" className="hover:text-[#111111] transition-colors">Why SideNote</a>
               <Link to="/login" className="hover:text-[#111111] transition-colors">Login to Dashboard</Link>
            </div>
         </div>
      </footer>

    </div>
  );
}