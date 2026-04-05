import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext';
import posthog from 'posthog-js';

if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
  posthog.init('YOUR_POSTHOG_API_KEY', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
