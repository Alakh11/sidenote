import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import type { User } from './types';
import axios from 'axios';
import Auth from './components/Auth/Auth';
import ErrorPage from './components/Error/ErrorPage';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [serverError, setServerError] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
            if (error.response.status === 503) setServerError(503);
            if (error.response.status === 410) setServerError(410);
        }
        return Promise.reject(error);
      }
    );
    
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user_data');
    
    if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  if (serverError === 503) return <ErrorPage code={503} />;
  if (serverError === 410) return <ErrorPage code={410} />;

  const handleLoginSuccess = (userData: any, token: string) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/sidenote/';
  };

  if (!user) {
    return (
      <div 
        className="h-screen w-full flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <GoogleOAuthProvider clientId="577129960094-dvqmurtgvtui2s2kunj7m73togc94kll.apps.googleusercontent.com">
            <Auth onLoginSuccess={handleLoginSuccess} />
        </GoogleOAuthProvider>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <RouterProvider router={router} context={{ user, handleLogout }} />
    </ThemeProvider>
  );
}

export default App;