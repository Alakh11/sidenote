import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  // Replace with your actual WhatsApp Bot number
  const WHATSAPP_NUMBER = "918796022992"; 
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi`;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg shadow-[#25D366]/40 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/50 transition-all duration-300 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 fill-current" />
      
      <span className="absolute right-16 px-3 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Log an expense
      </span>
    </a>
  );
}