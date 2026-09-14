import type { PageKey } from '@/components/Sidebar';

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
}

export function Header({ currentPage }: HeaderProps) {
  const { title, subtitle } = pageTitles[currentPage];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-8 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="ml-12 lg:ml-0">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </header>
  );
}
