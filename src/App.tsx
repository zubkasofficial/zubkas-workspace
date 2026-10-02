import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import type { PageKey } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Invoices } from '@/pages/Invoices';
import { GenericPage } from '@/pages/GenericPages';
import { Accounting } from '@/pages/Accounting';
import { Projects } from '@/pages/Projects';
import { Tasks } from '@/pages/Tasks';
import { Reports } from '@/pages/Reports';
import { Subscriptions } from '@/pages/Subscriptions';
import { Employees } from '@/pages/Employees';
import { Profile } from '@/pages/Profile';
import { Login } from '@/components/Login';
import { PasswordRecoveryModal } from '@/components/PasswordRecoveryModal';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PERMISSION_KEYS, hasPermission } from '@/utils/permissions';

const STORAGE_KEY = 'zubkas_active_page';
const VALID_PAGES: PageKey[] = [
  'dashboard', 'clients', 'quotations', 'invoices', 'payments',
  'accounting', 'projects', 'tasks', 'subscriptions', 'reports',
  'employees', 'settings', 'profile',
];

function getInitialPage(): PageKey {
  const hash = window.location.hash.replace('#', '');
  if (hash && VALID_PAGES.includes(hash as PageKey)) return hash as PageKey;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_PAGES.includes(saved as PageKey)) return saved as PageKey;
  } catch { /* ignore */ }
  return 'dashboard';
}

function AppContent() {
  const { user, logout, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>(getInitialPage);

  const navigate = (page: PageKey) => {
    setCurrentPage(page);
    try { localStorage.setItem(STORAGE_KEY, page); } catch { /* ignore */ }
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && VALID_PAGES.includes(hash as PageKey)) {
        setCurrentPage(hash as PageKey);
        try { localStorage.setItem(STORAGE_KEY, hash); } catch { /* ignore */ }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    const isAllowed =
      currentPage === 'profile' ||
      user.role === 'admin' ||
      hasPermission(user.permissions ?? {}, currentPage);
    if (!isAllowed) {
      const firstAllowed = PERMISSION_KEYS.find((key) => hasPermission(user.permissions ?? {}, key));
      navigate((firstAllowed as PageKey) ?? 'dashboard');
    }
  }, [user, currentPage]);

  const handleLogout = () => {
    logout();
    navigate('dashboard');
  };

  if (!user) {
    return (
      <SettingsProvider>
        <ToastProvider>
          <Login onLogin={() => { /* state update handled by AuthContext */ }} />
          {passwordRecovery && (
            <PasswordRecoveryModal onClose={clearPasswordRecovery} />
          )}
        </ToastProvider>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <WorkspaceProvider>
        <ToastProvider>
          <Layout currentPage={currentPage} onNavigate={navigate} onLogout={handleLogout}>
            {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} />}
            {currentPage === 'invoices' && <Invoices />}
            {currentPage === 'accounting' && <Accounting />}
            {currentPage === 'projects' && <Projects />}
            {currentPage === 'tasks' && <Tasks />}
            {currentPage === 'reports' && <Reports />}
            {currentPage === 'subscriptions' && <Subscriptions />}
            {currentPage === 'employees' && <Employees />}
            {currentPage === 'profile' && <Profile />}
            {!['dashboard', 'invoices', 'accounting', 'projects', 'tasks', 'reports', 'subscriptions', 'employees', 'profile'].includes(currentPage) && <GenericPage page={currentPage as Exclude<PageKey, 'dashboard' | 'invoices' | 'accounting' | 'projects' | 'tasks' | 'reports' | 'subscriptions' | 'employees' | 'profile'>} />}
          </Layout>
          {passwordRecovery && (
            <PasswordRecoveryModal onClose={clearPasswordRecovery} />
          )}
        </ToastProvider>
      </WorkspaceProvider>
    </SettingsProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
