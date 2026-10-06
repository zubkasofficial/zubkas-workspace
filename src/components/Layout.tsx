import { Sidebar, type PageKey } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useTheme } from '@/context/ThemeContext';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, onLogout, children }: LayoutProps) {
  const { theme, setMode } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        darkMode={theme.mode === 'dark'}
        onToggleDark={() => setMode(theme.mode === 'dark' ? 'light' : 'dark')}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="lg:pl-64">
        <Header
          currentPage={currentPage}
          darkMode={theme.mode === 'dark'}
          onToggleDark={() => setMode(theme.mode === 'dark' ? 'light' : 'dark')}
          onOpenSidebar={() => setMobileOpen(true)}
          onNavigateProfile={() => onNavigate('profile')}
        />
        <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="animate-fade-in">{children}</div>
        </main>
        <footer className="px-4 py-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-slate-400 dark:text-slate-600">Powered by Zubkas Workspace</p>
        </footer>
      </div>
    </div>
  );
}
