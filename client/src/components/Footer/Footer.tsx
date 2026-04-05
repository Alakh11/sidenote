import { Link } from '@tanstack/react-router';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Support & Feedback', href: '/feedback' },
];

export default function Footer() {
  return (
    <footer className="w-full py-6 px-4 md:px-0 border-t border-slate-200 dark:border-slate-800/60 mt-12 transition-colors duration-300">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 max-w-6xl mx-auto">
        
        {/* Copyright Section */}
        <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium text-center md:text-left">
          &copy; {new Date().getFullYear()} <span className="font-bold text-[#111111] dark:text-white">Side<span className="text-[#25D366]">Note</span></span>. All rights reserved.
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[#25D366] dark:hover:text-[#25D366] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
      </div>
    </footer>
  );
}