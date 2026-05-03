import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import type { User } from './types';
import axios from 'axios';
import ErrorPage from './components/Error/ErrorPage';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import posthog from 'posthog-js';

function App() {
  const [serverError, setServerError] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const CURRENT_FRONTEND_VERSION = "1.0.0";

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        const serverVersion = response.headers['x-app-version'];
        if (serverVersion && serverVersion !== CURRENT_FRONTEND_VERSION) {
            console.warn("New version detected. Force reloading...");
            window.location.reload(); 
        }
        return response;
      },
      (error) => {
        if (error.response) {
            const serverVersion = error.response.headers['x-app-version'];
            if (serverVersion && serverVersion !== CURRENT_FRONTEND_VERSION) {
                window.location.reload();
            }

            if (error.response.status === 503) setServerError(503);
            if (error.response.status === 410) setServerError(410);
        }
        if (error.response && error.response.status === 401) {
            console.warn("Session expired. Logging out.");
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            delete axios.defaults.headers.common['Authorization'];
            posthog.reset();
            
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
      }
    );
    
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user_data');
    
    if (token && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        if (!window.location.pathname.startsWith('/admin')) {
            posthog.identify(parsedUser.email || parsedUser.mobile, {
                name: parsedUser.name,
                email: parsedUser.email
            });
        }
    }
    setIsLoaded(true);
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  if (serverError === 503) return <ErrorPage code={503} />;
  if (serverError === 410) return <ErrorPage code={410} />;
  if (!isLoaded) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    posthog.reset();
    window.location.href = '/login';
  };

  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId="577129960094-8u7ef3ijs82pkmdou8goofcqatku3c70.apps.googleusercontent.com">
        {user ? (
          <PreferencesProvider user={user}>
            <RouterProvider router={router} context={{ user, handleLogout }} />
          </PreferencesProvider>
        ) : (
          <RouterProvider router={router} context={{ user: null, handleLogout }} />
        )}
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

export default App;