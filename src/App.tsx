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
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PERMISSION_KEYS, hasPermission } from '@/utils/permissions';

function AppContent() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  useEffect(() => {
    if (!user) return;
    const isAllowed =
      currentPage === 'profile' ||
      user.role === 'admin' ||
      hasPermission(user.permissions ?? {}, currentPage);
    if (!isAllowed) {
      const firstAllowed = PERMISSION_KEYS.find((key) => hasPermission(user.permissions ?? {}, key));
      setCurrentPage((firstAllowed as PageKey) ?? 'dashboard');
    }
  }, [user, currentPage]);

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
  };

  if (!user) {
    return (
      <SettingsProvider>
        <ToastProvider>
          <Login onLogin={() => { /* state update handled by AuthContext */ }} />
        </ToastProvider>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <WorkspaceProvider>
        <ToastProvider>
          <Layout currentPage={currentPage} onNavigate={setCurrentPage} onLogout={handleLogout}>
            {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
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
