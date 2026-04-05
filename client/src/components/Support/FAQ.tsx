import { useState } from 'react';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "What is SideNote?",
      answer: "SideNote is a simple WhatsApp-based tool where you can note your daily entries by sending messages like “200 chai”."
    },
    {
      question: "How do I use it?",
      answer: "Just send a message with an amount and item, like “50 lunch”. SideNote will note it and update your totals automatically."
    },
    {
      question: "Do I need to install any app?",
      answer: "No. SideNote works directly on WhatsApp, so there is nothing extra to download or install."
    },
    {
      question: "How do I see my totals?",
      answer: "Type “summary” anytime in the WhatsApp chat to see your current overview."
    },
    {
      question: "What else can I do besides summary?",
      answer: "You can also type “week” or “month” to see more detailed breakdowns of your expenses and entries."
    },
    {
      question: "What kind of messages can I send?",
      answer: "Send simple messages with an amount and item, like “120 groceries” or “40 auto”. Keep it natural!"
    },
    {
      question: "What if I send something wrong?",
      answer: "You can simply send a corrected message again. The latest entry will be used and updated in your records."
    },
    {
      question: "Is my data safe?",
      answer: "Yes. Your data is stored securely and used only to generate your summaries. We do not sell your data to third parties."
    },
    {
      question: "Do I need to connect my bank account?",
      answer: "No. SideNote only works with the manual messages you send to it. It does not request or access your bank account."
    },
    {
      question: "Is SideNote free to use?",
      answer: "Currently, SideNote is completely free to use!"
    },
    {
      question: "Can I stop using it anytime?",
      answer: "Yes. You can stop using SideNote anytime by simply not sending messages. You are always in control."
    },
    {
      question: "Why does it feel so simple?",
      answer: "SideNote is intentionally designed to work like a natural chat with a friend, so you don’t need to learn a complex interface or navigate clunky menus."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20">
      
      {/* Header Section */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
            <HelpCircle size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-white mb-4 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-stone-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
          Everything you need to know about SideNote, how it works, and how to get the most out of your WhatsApp tracker.
        </p>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          
          return (
            <div 
              key={index} 
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 overflow-hidden ${
                isOpen 
                ? 'border-blue-500 dark:border-blue-500 shadow-md shadow-blue-500/10' 
                : 'border-stone-200 dark:border-slate-800 shadow-sm hover:border-stone-300 dark:hover:border-slate-700'
              }`}
            >
              <button 
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left focus:outline-none"
              >
                <span className={`font-bold text-lg transition-colors ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-stone-800 dark:text-white'}`}>
                  {faq.question}
                </span>
                <div className={`p-1 rounded-full flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-stone-100 text-stone-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                  <ChevronDown size={20} />
                </div>
              </button>
              
              <div 
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6 text-stone-600 dark:text-slate-400 leading-relaxed border-t border-stone-100 dark:border-slate-800 pt-4 mt-2 mx-2">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Still need help? Box */}
      <div className="mt-12 bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
              <MessageCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-2">Still have questions?</h3>
          <p className="text-stone-500 dark:text-slate-400 mb-6">Can't find the answer you're looking for? We're here to help.</p>
          <a 
            href="/feedback" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Contact Support
          </a>
      </div>

    </div>
  );
}