import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext';
import posthog from 'posthog-js';

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
  posthog.init(POSTHOG_API_KEY, {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    person_profiles: 'identified_only'
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
