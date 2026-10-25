// Writes dist/<route>/index.html for each public route so GitHub Pages serves them
// with HTTP 200 and page-specific meta, instead of the 404.html SPA fallback.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://www.sidenote.in';
const pages = [
  { path: '/faq/', title: 'FAQ | SideNote WhatsApp Expense Tracker', description: 'Answers to common questions about SideNote: logging expenses on WhatsApp, summaries, Shared Spaces, privacy and pricing.' },
  { path: '/help/', title: 'Help & Commands | SideNote', description: 'How to use SideNote: every WhatsApp command for logging expenses, income, summaries, budgets and Shared Spaces.' },
  { path: '/feature/groups/', title: 'Shared Spaces | Split Group Expenses on WhatsApp | SideNote', description: 'Track and settle shared expenses with friends, flatmates and trips right inside WhatsApp. Free with SideNote.' },
  { path: '/privacy/', title: 'Privacy Policy | SideNote', description: 'How SideNote collects, stores and protects your data. We never access your bank and never sell your data.' },
  { path: '/terms/', title: 'Terms of Service | SideNote', description: 'The terms that apply when you use SideNote, the WhatsApp expense tracker.' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const base = readFileSync('dist/index.html', 'utf8');

const withMeta = (html, { path, title, description }) => {
  const url = SITE + path;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta (?:property="og|name="twitter):title" content=")[^"]*"/g, `$1${esc(title)}"`)
    .replace(/(<meta (?:property="og|name="twitter):description" content=")[^"]*"/g, `$1${esc(description)}"`)
    // The home page's structured data (incl. its FAQ) describes the home page only
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
};

for (const page of pages) {
  const dir = `dist${page.path}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}index.html`, withMeta(base, page));
}

// Every other URL (dashboard, login, unknown paths) falls back to 404.html: keep it out of search results
writeFileSync(
  'dist/404.html',
  base
    .replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex"')
    .replace(/\s*<link rel="canonical"[^>]*>/, ''),
);

console.log(`seo-pages: wrote ${pages.length} route pages and 404.html`);
