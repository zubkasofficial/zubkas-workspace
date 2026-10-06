import type { PageKey } from '@/components/Sidebar';
import { ZubkasIcon } from '@/components/ZubkasIcon';
import { Moon, Sun, User } from 'lucide-react';

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your business performance' },
  clients: { title: 'Clients', subtitle: 'Manage your client relationships' },
  quotations: { title: 'Quotations', subtitle: 'Create and track price quotes' },
  invoices: { title: 'Invoices', subtitle: 'Manage invoices and track payments' },
  payments: { title: 'Payments', subtitle: 'View payment history and ledger' },
  accounting: { title: 'Accounting', subtitle: 'Track income and expenses' },
  projects: { title: 'Projects', subtitle: 'Manage project timelines and budgets' },
  tasks: { title: 'Project Tasks', subtitle: 'Assign, track deadlines, and organize deliverables across all client projects' },
  subscriptions: { title: 'Subscriptions', subtitle: 'Track recurring software costs' },
  reports: { title: 'Reports', subtitle: 'Generate business intelligence reports' },
  employees: { title: 'Employee Management', subtitle: 'Manage staff accounts, departments, and module permissions' },
  settings: { title: 'Settings', subtitle: 'Configure your workspace preferences' },
  profile: { title: 'My Profile', subtitle: 'Manage your account details and login credentials' },
};

interface HeaderProps {
  currentPage: PageKey;
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenSidebar: () => void;
  onNavigateProfile: () => void;
}

export function Header({ currentPage, darkMode, onToggleDark, onOpenSidebar, onNavigateProfile }: HeaderProps) {
  const { title, subtitle } = pageTitles[currentPage];

  return (
    <>
      {/* Mobile Top Bar — hamburger left, brand center, actions right */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onOpenSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <ZubkasIcon className="h-7 w-7" variant="color" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">Zubkas</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleDark}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={onNavigateProfile}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop Header — page title only */}
      <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur-md lg:block dark:border-slate-800 dark:bg-slate-900/80">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </header>

      {/* Mobile Page Title — inside main content flow */}
      <div className="px-4 pt-4 lg:hidden">
        <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </>
  );
}
