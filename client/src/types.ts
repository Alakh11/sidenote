import type { ReactNode } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  picture?: string;
  mobile?: string;
}

export interface Transaction {
  is_recurring: number | boolean;
  category_name: string;
  description: ReactNode;
  tags: any;
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note: string;
  payment_mode: string;
  category_icon?: string;
  user_email: string;
}

export interface BudgetCategory {
  name: string;
  budget_limit: number;
  spent: number;
  color: string;
}

export interface DashboardStats {
  income: number;
  expense: number;
  balance: number;
}