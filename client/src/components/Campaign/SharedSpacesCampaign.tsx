import { useEffect, useRef, useState } from 'react';
import './SharedSpacesCampaign.css';

const WHATSAPP_NUMBER = '918796022992';
const CREATE_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('create split group goatrip')}`;

interface Bubble {
  from: 'sent' | 'bot';
  before?: string;
  tag?: string;
  after?: string;
  time: string;
}

interface Expense {
  emoji: string;
  name: string;
  payer: 'You' | 'Alex';
  amount: number;
}

const EXPENSES: Expense[] = [
  { emoji: '🏨', name: 'Hotel', payer: 'You', amount: 20000 },
  { emoji: '🍽️', name: 'Dinner', payer: 'Alex', amount: 1200 },
  { emoji: '🚕', name: 'Cab', payer: 'You', amount: 500 },
];

const CREATE_BUBBLES: Bubble[] = [
  { from: 'sent', before: 'create ', tag: '@goatrip', time: '10:44' },
  { from: 'bot', tag: '@goatrip', after: ' created ✓', time: '10:45' },
  { from: 'bot', before: 'Invite Alex to use the same group name', time: '10:44' },
];
const HOTEL: Bubble[] = [
  { from: 'sent', tag: '@goatrip', after: ' 20000 hotel', time: '10:43' },
  { from: 'bot', before: 'Added ₹20,000 to ', tag: '@goatrip', after: ' 🏨', time: '10:43' },
];
const DINNER: Bubble[] = [
  { from: 'sent', tag: '@goatrip', after: ' 1200 dinner', time: '10:45' },
  { from: 'bot', before: 'Added ₹1,200 to ', tag: '@goatrip', after: ' 🍽️', time: '10:45' },
];
const CAB: Bubble[] = [
  { from: 'sent', tag: '@goatrip', after: ' 500 cab', time: '10:41' },
  { from: 'bot', before: 'Added ₹500 to ', tag: '@goatrip', after: ' 🚕', time: '10:41' },
];

interface Frame {
  you: Bubble[];
  alex: Bubble[];
  shown: number;
  flow: 'left' | 'right' | null;
  ms: number;
}

const FRAMES: Frame[] = [
  { you: [], alex: [], shown: 0, flow: null, ms: 900 },
  { you: CREATE_BUBBLES, alex: [], shown: 0, flow: null, ms: 1300 },
  { you: [...CREATE_BUBBLES, ...HOTEL], alex: [], shown: 1, flow: 'left', ms: 2300 },
  { you: [...CREATE_BUBBLES, ...HOTEL], alex: DINNER, shown: 2, flow: 'right', ms: 2300 },
  { you: [...CREATE_BUBBLES, ...HOTEL, ...CAB], alex: DINNER, shown: 3, flow: 'left', ms: 3600 },
];
const FINAL = FRAMES.length - 1;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function MiniChat({ who, bubbles }: { who: 'you' | 'alex'; bubbles: Bubble[] }) {
  const isYou = who === 'you';
  return (
    <article className={`hero-chat ${who}-chat`} aria-label={`${isYou ? 'Your' : "Alex's"} WhatsApp chat with Expense Tracker`}>
      <div className="chat-label">
        <span className={`person-avatar person-avatar--${who}`}>{isYou ? 'Y' : 'A'}</span>
        <span>{isYou ? 'Your WhatsApp' : "Alex's WhatsApp"}</span>
      </div>
      <div className="mini-chat-window">
        <header className="mini-chat-header">
          <span className="bot-avatar">₹</span>
          <div className="mini-chat-name">
            <strong>Expense Tracker</strong>
            <small>online</small>
          </div>
        </header>
        <div className="mini-chat-wallpaper" aria-live="polite">
          {bubbles.length === 0 && <span className="empty-chat-note">Start in your own chat</span>}
          {bubbles.map((b, i) => (
            <div key={`${b.time}-${i}-${b.after ?? b.before}`} className={`mini-bubble-row mini-bubble-row--${b.from}`}>
              <p className="mini-chat-bubble">
                <span>
                  {b.before}
                  {b.tag && <strong>{b.tag}</strong>}
                  {b.after}
                </span>
                <small>
                  <span>{b.time}</span>
                  <span className="ticks">✓✓</span>
                </small>
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function HeroVisual() {
  const [frame, setFrame] = useState(() => (prefersReducedMotion() ? FINAL : 0));
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = setTimeout(() => {
      const next = (frame + 1) % FRAMES.length;
      setFrame(next);
      // The dashboard lifts slightly each time a new expense lands
      if (FRAMES[next].flow) setUpdating(true);
    }, FRAMES[frame].ms);
    return () => clearTimeout(timer);
  }, [frame]);

  useEffect(() => {
    if (!updating) return;
    const timer = setTimeout(() => setUpdating(false), 600);
    return () => clearTimeout(timer);
  }, [updating]);

  const { you, alex, shown, flow } = FRAMES[frame];
  const total = EXPENSES.slice(0, shown).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="hero-visual">
      <MiniChat who="you" bubbles={you} />
      <MiniChat who="alex" bubbles={alex} />

      <div className="convergence-layer" aria-hidden="true">
        <svg className="convergence-lines" viewBox="0 0 720 130" preserveAspectRatio="none">
          <path d="M180 4 C210 66 272 90 321 118" />
          <path d="M540 4 C510 66 448 90 399 118" />
        </svg>
        {/* key restarts the CSS animation each time a new expense flows down */}
        <span key={`l-${frame}`} className={`flow-dot flow-dot--left ${flow === 'left' ? 'is-on' : ''}`} />
        <span key={`r-${frame}`} className={`flow-dot flow-dot--right ${flow === 'right' ? 'is-on' : ''}`} />
      </div>

      <div className="shared-dashboard-wrap">
        <span className="shared-label">Same @groupname → Automatically shared</span>
        <p className="mobile-flow-note">BOTH CHATS FEED ONE SPACE</p>
        <article className={`shared-dashboard ${updating ? 'is-updating' : ''}`} aria-label="Goa Trip shared expense dashboard">
          <header className="dashboard-head">
            <span className="space-mark">🌴</span>
            <div>
              <strong>@goatrip</strong>
              <span>Goa Trip · Shared Space</span>
            </div>
          </header>
          <div className="member-row">
            <div className="member-stack">
              <span className="person-avatar person-avatar--you">Y</span>
              <span className="person-avatar person-avatar--alex">A</span>
            </div>
            <div className="member-copy">
              <strong>You + Alex</strong>
              <span>2 members · {shown} expenses</span>
            </div>
          </div>
          <div className="dashboard-rule" />
          <p className="expense-label">EXPENSES</p>
          <div className="expense-list">
            {EXPENSES.map((e, i) => (
              <div
                key={e.name}
                className={`expense-row ${i < shown ? 'is-visible' : 'is-hidden'} ${i === shown - 1 && flow ? 'is-active' : ''}`}
              >
                <span className="expense-icon">{e.emoji}</span>
                <div className="expense-row__copy">
                  <strong>{e.name}</strong>
                  <small className={e.payer === 'You' ? 'you' : 'alex'}>Paid by {e.payer}</small>
                </div>
                <strong className="expense-amount">{rupees(e.amount)}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-rule" />
          <div className="total-row">
            <span>TOTAL SHARED SPEND</span>
            <strong>{rupees(total)}</strong>
          </div>
          <p className="updated"><span className="pulse-dot" /> Updated just now</p>
          <p className="shared-note">Everyone sees the same expenses.</p>
        </article>
      </div>
    </div>
  );
}

function CreateButton() {
  return (
    <a className="primary-cta" href={CREATE_URL} target="_blank" rel="noopener noreferrer">
      Create a Shared Space →
    </a>
  );
}

function ChaosSection() {
  const ref = useRef<HTMLElement>(null);
  // Without IntersectionObserver (very old browsers) just show the sorted state
  const [on, setOn] = useState(() => typeof IntersectionObserver === 'undefined');

  // Messy messages settle into one sorted card the first time the section scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setOn(true); observer.disconnect(); }
    }, { threshold: 0.35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const messages: [string, number, number][] = [
    ['I paid the hotel', -4, 0.7],
    ['Dinner was ₹1200', 3, 0.45],
    ['Who paid for the cab?', -2, 0.8],
    ['Bro send your expenses', 5, 0.52],
    ['Wait, how much did we spend?', -3, 0.62],
  ];

  return (
    <section ref={ref} className="section chaos-section">
      <span className="section-kicker">THE GROUP CHAT, SORTED</span>
      <h2 className="section-title">No more expense chaos.</h2>
      <p className="section-sub">Just mention the group. Everything stays together.</p>
      <div className="chaos-stage">
        <div className={`chaos-cloud ${on ? 'is-on' : ''}`}>
          {messages.map(([text, rotate, opacity]) => (
            <span key={text} className="chaos-msg" style={{ transform: `rotate(${rotate}deg)`, opacity }}>{text}</span>
          ))}
        </div>
        <div className={`sorted-card ${on ? 'is-on' : ''}`}>
          <header>🌴 @goatrip</header>
          {EXPENSES.map((e) => (
            <div key={e.name} className="sorted-line"><span>{e.name}</span><strong>{rupees(e.amount)}</strong></div>
          ))}
          <div className="sorted-line"><span>TOTAL</span><strong>{rupees(21700)}</strong></div>
        </div>
      </div>
    </section>
  );
}

function Phone({ label }: { label: string }) {
  return (
    <div className="phone-wrap">
      <p className="phone-label">{label}</p>
      <div className="phone">
        <div className="phone-screen">
          <div className="status-bar"><span>9:41</span><span>● ◔ ▰</span></div>
          <div className="phone-title">🌴 <strong>@goatrip</strong><small>2 members</small></div>
          <div className="phone-expenses">
            {EXPENSES.map((e) => (
              <p key={e.name}><span>{e.name}</span><strong>{rupees(e.amount)}</strong></p>
            ))}
            <div className="phone-total"><span>Total</span><strong>{rupees(21700)}</strong></div>
          </div>
          <div className="phone-home" />
        </div>
      </div>
    </div>
  );
}

export default function SharedSpacesCampaign() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Shared Spaces | Split group expenses on WhatsApp | SideNote';
    return () => { document.title = previous; };
  }, []);

  return (
    <main className="shared-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SHARED SPACES</span>
          <h1>Two people.<br />One shared<br />expense space.</h1>
          <p>Both of you keep using WhatsApp normally. Just add @groupname to an expense and it automatically shows up in your shared space.</p>
          <p className="hero-key">
            <strong>Different chats. Same expenses.</strong>
            <span>You don't need to be in the same WhatsApp chat. Just use the same @groupname and the expenses come together automatically.</span>
          </p>
          <div className="chip-list">
            {['❤️ Couples', '✈️ Trips', '🏠 Roommates', '🍕 Friends'].map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
          <div className="hero-actions">
            <CreateButton />
            <a className="text-link" href="#how-it-works">See how it works ↓</a>
          </div>
        </div>
        <HeroVisual />
        <div className="hero-actions hero-actions--mobile">
          <CreateButton />
          <a className="text-link" href="#how-it-works">See how it works ↓</a>
        </div>
      </section>

      <section className="message-strip">
        <h2>Different chats. Same expenses.</h2>
        <p>You don't need to be in the same WhatsApp chat. Just use the same @groupname and the expenses come together automatically.</p>
        <strong>Stop chasing everyone for their expenses. Just use the same @groupname.</strong>
        <CreateButton />
      </section>

      <ChaosSection />

      <section className="section steps-section" id="how-it-works">
        <span className="section-kicker">A LITTLE MAGIC IN THE CHAT</span>
        <h2 className="section-title">How it works</h2>
        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <h3>CREATE A SPACE</h3>
            <div className="snippet">create @goatrip 2 members</div>
            <div className="snippet received">→ @goatrip created 🎉</div>
            <p>Send one message to create your shared space.</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <h3>LOG EXPENSES</h3>
            <div className="snippet">@goatrip 20000 hotel</div>
            <div className="snippet received">@goatrip 1200 dinner</div>
            <p>Anyone can log expenses just by mentioning the group.</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <h3>SEE IT TOGETHER</h3>
            <div className="mini-total">
              <span>🌴 @goatrip · 3 expenses</span>
              <strong>{rupees(21700)}</strong>
            </div>
            <p>Everyone sees the same shared expenses and total, instantly.</p>
          </article>
        </div>
      </section>

      <section className="section phones-section">
        <span className="section-kicker">SAME SPACE, DIFFERENT SCREEN</span>
        <h2 className="section-title">Everyone stays in sync.</h2>
        <div className="phones">
          <Phone label="You" />
          <div className="phone-bridge"><span>↔</span>Different phones.<br />One shared space.</div>
          <Phone label="Alex" />
        </div>
      </section>

      <section className="section value-section">
        <span className="section-kicker">THE SIMPLE VERSION</span>
        <h2>Your group doesn't need another app.</h2>
        <p className="section-sub">Just keep using the chat you already use.</p>
        <div className="value-lines">
          <span>No app.</span>
          <span>No spreadsheet.</span>
          <span>No 'send me the expenses.'</span>
          <strong>Just mention @goatrip.</strong>
        </div>
      </section>

      <section className="cta-section">
        <span className="section-kicker">READY WHEN YOU ARE</span>
        <h2>Everyone pays.<br />Everyone sees.<br />Nothing gets lost.</h2>
        <p className="section-sub">Create a shared space and start tracking together.</p>
        <CreateButton />
      </section>
    </main>
  );
}
