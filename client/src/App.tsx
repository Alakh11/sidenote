import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import type { User } from './types';
import axios from 'axios';
import ErrorPage from './components/Error/ErrorPage';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CryptoJS from 'crypto-js';

const queryClient = new QueryClient();
const SECRET_KEY = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_API_ENCRYPTION_KEY);

const encryptPayload = (data: any) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const combined = iv.clone().concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
};

const decryptPayload = (encryptedBase64: string) => {
  const combined = CryptoJS.enc.Base64.parse(encryptedBase64);
  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
  const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
  
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext });
  
  const decrypted = CryptoJS.AES.decrypt(cipherParams, SECRET_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

function App() {
  const [serverError, setServerError] = useState<{code: number, message?: string} | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const CURRENT_FRONTEND_VERSION = "1.0.0";
  
  axios.defaults.headers.common['Content-Type'] = 'application/json';

  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      config.headers['X-Encrypted'] = 'true';
      
      if (config.data && !(config.data instanceof FormData)) {
        config.data = encryptPayload(config.data);
        config.headers['Content-Type'] = 'text/plain'; 
      }
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      (response) => {
        const serverVersion = response.headers['x-app-version'];
        if (serverVersion && serverVersion !== CURRENT_FRONTEND_VERSION) {
            console.warn("New version detected. Force reloading...");
            window.location.reload(); 
        }

        if (response.config.headers['X-Encrypted'] === 'true' && typeof response.data === 'string') {
          try {
            response.data = decryptPayload(response.data);
          } catch (err) {
            console.error("API Decryption failed", err);
          }
        }

        return response;
      },
      (error) => {
        if (error.response) {
            const status = error.response.status;
            const serverVersion = error.response.headers['x-app-version'];
            
            if (serverVersion && serverVersion !== CURRENT_FRONTEND_VERSION) {
                window.location.reload();
            }

            if (status === 403) {
                setServerError({
                    code: 403,
                    message: error.response.data?.detail || "Access Restricted: SideNote is not available in your region."
                });
            } else if (status === 503) {
                setServerError({ code: 503 });
            } else if (status === 410) {
                setServerError({ code: 410 });
            } else if (status === 401) {
                console.warn("Session expired. Logging out.");
                localStorage.removeItem('token');
                localStorage.removeItem('user_data');
                delete axios.defaults.headers.common['Authorization'];
                window.location.href = '/login'; 
            }
        } else if (error.message === 'Network Error') {
            setServerError({ code: 500, message: "Network Error: Could not connect to the API." });
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
    }
    setIsLoaded(true);

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  if (serverError) {
      return <ErrorPage code={serverError.code as any} customMessage={serverError.message} />;
  }
  
  if (!isLoaded) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          {user ? (
            <PreferencesProvider user={user}>
              <RouterProvider router={router} context={{ user, handleLogout }} />
            </PreferencesProvider>
          ) : (
            <RouterProvider router={router} context={{ user: null, handleLogout }} />
          )}
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;