import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

interface PrefContextType {
    viewMode: 'day' | 'week' | 'month' | 'year';
    setViewMode: (mode: 'day' | 'week' | 'month' | 'year') => void;
    currency: string;
    setCurrency: (sym: string) => void;
    monthStart: number;
    setMonthStart: (day: number) => void;
    savePreferences: () => Promise<void>;
}

export const PreferencesContext = createContext<PrefContextType | undefined>(undefined);

export const PreferencesProvider = ({ children, user }: { children: React.ReactNode, user: any }) => {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [currency, setCurrency] = useState(user?.currency || '₹');
    const [monthStart, setMonthStart] = useState(user?.month_start_date || 1);

    const savePreferences = async () => {
        try {
            await axios.put(`https://sidenote-8nu4.onrender.com/auth/preferences`, {
                currency,
                month_start_date: monthStart
            });
            // Update local storage
            const updatedUser = { ...user, currency, month_start_date: monthStart };
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
        } catch (e) {
            console.error("Failed to save preferences", e);
        }
    };

    return (
        <PreferencesContext.Provider value={{ viewMode, setViewMode, currency, setCurrency, monthStart, setMonthStart, savePreferences }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (!context) throw new Error("usePreferences must be used within Provider");
    return context;
};