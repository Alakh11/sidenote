import { 
  createRouter, 
  createRoute, 
  createRootRouteWithContext, 
  Outlet, 
  redirect,
  NotFoundRoute, 
} from '@tanstack/react-router';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Transactions from './components/Transactions/Transactions';
import Recurring from './components/Recurring/Recurring';
import BudgetPlanner from './components/Budget/BudgetPlanner';
import Goals from './components/Goals/Goals';
import Analytics from './components/Analytics/Analytics';
import CategoryManager from './components/CategoryManager/CategoryManager'; 
import type { User } from './types';
import NotFound from './components/Error/NotFound';
import ErrorPage from './components/Error/ErrorPage';
import LoanTracker from './components/Loans/LoanTracker';
import Debts from './components/Debts/Debts';
import AdminPanel from './components/Admin/AdminPanel';
import ProfileSettings from './components/Settings/ProfileSettings';
import Home from './components/Home/Home';
import Auth from './components/Auth/Auth';

interface RouterContext {
  user: User | null;
  handleLogout: () => void;
}

const API_URL = "https://sidenote-8nu4.onrender.com";

// --- 1. Root Route ---
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  errorComponent: ({ error }) => {
    return <ErrorPage code={500} customMessage={error.message} />;
  },
  notFoundComponent: NotFound,
});

const authRoute = createRoute({
  id: '_auth',
  getParentRoute: () => rootRoute,
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

// --- 2. Dashboard Route ---
const dashboardRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/dashboard',
  loader: async ({ context }) => {
    const viewMode = localStorage.getItem('viewMode') || 'month';
    const [dashboard, categories, prediction, insights] = await Promise.all([
        axios.get(`${API_URL}/dashboard/${context.user!.email}?view_by=${viewMode}`),
        axios.get(`${API_URL}/categories/${context.user!.email}`),
        axios.get(`${API_URL}/predict/${context.user!.email}`),
        axios.get(`${API_URL}/insights/${context.user!.email}`)
    ]);

    return { 
        ...dashboard.data, 
        categories: categories.data, 
        prediction: prediction.data,
        insights: insights.data
    };
  },
  component: Dashboard,
});

// --- 3. Transactions Route ---
const transactionsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/transactions',
  loader: async ({ context }) => {
    const viewMode = localStorage.getItem('viewMode') || 'month';
    const [transactions, categories] = await Promise.all([
        axios.get(`${API_URL}/transactions/${context.user!.email}?view_by=${viewMode}`),
        axios.get(`${API_URL}/categories/${context.user!.email}`)
    ]);
    return { 
        initialTransactions: transactions.data, 
        categories: categories.data 
    };
  },
  component: Transactions,
});

// --- 4. Budget Route ---
const budgetRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/budget',
  loader: async ({ context }) => {
    const viewMode = localStorage.getItem('viewMode') || 'month'; 
    const [status, categories, history] = await Promise.all([
        axios.get(`${API_URL}/budgets/${context.user!.email}?view_by=${viewMode}`), 
        axios.get(`${API_URL}/categories/${context.user!.email}`),
        axios.get(`${API_URL}/budgets/history/${context.user!.email}`)
    ]);
    return { 
        budgets: status.data, 
        categories: categories.data,
        history: history.data 
    };
  },
  component: BudgetPlanner,
});

// --- 5. Goals Route ---
const goalsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/goals',
  loader: async ({ context }) => {
    const res = await axios.get(`${API_URL}/goals/${context.user!.email}`);
    return { goals: res.data };
  },
  component: Goals,
});

// --- 6. Recurring Route ---
const recurringRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/recurring',
  loader: async ({ context }) => {
    const res = await axios.get(`${API_URL}/recurring/${context.user!.email}`);
    return res.data;
  },
  component: Recurring,
});

// --- 7. Analytics Route ---
const analyticsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/analytics',
  loader: async ({ context }) => {
    const viewMode = localStorage.getItem('viewMode') || 'month';
    const [analytics, dailyIncome, monthlyIncome, categoryMonthly, goals] = await Promise.all([
        axios.get(`${API_URL}/analytics/${context.user!.email}?view_by=${viewMode}`),
        axios.get(`${API_URL}/income/daily/${context.user!.email}`),
        axios.get(`${API_URL}/income/monthly/${context.user!.email}`),
        axios.get(`${API_URL}/analytics/category-monthly/${context.user!.email}`),
        axios.get(`${API_URL}/goals/${context.user!.email}`)
    ]);
    return { 
        ...analytics.data, 
        dailyIncome: dailyIncome.data, 
        monthlyIncome: monthlyIncome.data,
        categoryMonthly: categoryMonthly.data,
        goals: goals.data 
    };
  },
  component: Analytics,
});

// --- 8. Categories Route ---
const categoriesRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/categories',
  loader: async ({ context }) => {
    const res = await axios.get(`${API_URL}/categories/${context.user!.email}`);
    return res.data;
  },
  component: CategoryManager,
});

// --- 9. Loans Route ---
const loansRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/loans',
  loader: async ({ context }) => {
    const res = await axios.get(`${API_URL}/loans/${context.user!.email}`);
    return res.data;
  },
  component: LoanTracker,
});

// --- 10. Debts Route (Money Lent) ---
const debtsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/debts',
  loader: async ({ context }) => {
    const [dashboardData, borrowersList] = await Promise.all([
        axios.get(`${API_URL}/debts/dashboard/${context.user!.email}`),
        axios.get(`${API_URL}/debts/borrowers/${context.user!.email}`)
    ]);
    
    return {
        stats: dashboardData.data.stats,
        top_borrowers: dashboardData.data.top_borrowers,
        all_borrowers: borrowersList.data
    };
  },
  component: Debts,
});

// --- 11. Index & 404 ---
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: () => {
    return (
      <div 
        className="h-screen w-full flex items-center justify-center bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')` }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
            <Auth onLoginSuccess={(user, token) => {
              localStorage.setItem('token', token);
              localStorage.setItem('user_data', JSON.stringify(user)); // <-- Fixed key to match App.tsx
              window.location.href = '/dashboard';
            }} />
        </div>
      </div>
    );
  }
});
// --- 12. Admin Route ---
const adminRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/admin',
  beforeLoad: ({ context }) => {
    if (context.user?.email !== "alakhchaturvedi2002@gmail.com") {
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async () => {
    const token = localStorage.getItem('token'); 
    const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` } 
    });
    return res.data;
  },
  component: AdminPanel,
});

const settingsRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'settings',
  component: ProfileSettings,
});

const notFoundRoute = new NotFoundRoute({
  getParentRoute: () => rootRoute,
  component: NotFound,
});


// --- Assemble Route Tree ---
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    budgetRoute,
    goalsRoute,
    recurringRoute,
    analyticsRoute,
    categoriesRoute,
    loansRoute,
    debtsRoute,
    adminRoute,
    settingsRoute,
  ])
]);

export const router = createRouter({
  routeTree,
  basepath: '/', 
  context: { 
    user: null, 
    handleLogout: undefined!
  },
  notFoundRoute,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
export default router;
