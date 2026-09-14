import { Sidebar, type PageKey } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useTheme } from '@/context/ThemeContext';
import type { ReactNode } from 'react';

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, onLogout, children }: LayoutProps) {
  const { theme, setMode } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        darkMode={theme.mode === 'dark'}
        onToggleDark={() => setMode(theme.mode === 'dark' ? 'light' : 'dark')}
        onLogout={onLogout}
      />
      <div className="lg:pl-64">
        <Header currentPage={currentPage} />
        <main className="px-6 py-6 lg:px-8">
          <div className="animate-fade-in">{children}</div>
        </main>
        <footer className="px-6 py-4 text-center lg:px-8">
          <p className="text-xs text-slate-400 dark:text-slate-600">Powered by Zubkas Workspace</p>
        </footer>
      </div>
    </div>
  );
}
