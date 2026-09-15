import { LayoutDashboard, Users, FileText, Receipt, CreditCard, Calculator, FolderKanban, Repeat, ChartBar as BarChart3, Settings, Moon, Sun, Menu, X, LogOut, ChevronDown, ChevronRight, SquareCheck as CheckSquare, UserCog, User } from 'lucide-react';
import { useState } from 'react';
import { hasPermission } from '@/utils/permissions';
import { useAuth } from '@/context/AuthContext';
import whiteLogo from '@/assets/icon_white.png';

export type PageKey =
  | 'dashboard'
  | 'clients'
  | 'quotations'
  | 'invoices'
  | 'payments'
  | 'accounting'
  | 'projects'
  | 'tasks'
  | 'subscriptions'
  | 'reports'
  | 'employees'
  | 'settings'
  | 'profile';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  children?: { key: PageKey; label: string; icon: typeof LayoutDashboard }[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'quotations', label: 'Quotations', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'accounting', label: 'Accounting', icon: Calculator },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    children: [
      { key: 'projects', label: 'All Projects', icon: FolderKanban },
      { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  { key: 'subscriptions', label: 'Subscriptions', icon: Repeat },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'employees', label: 'Employees', icon: UserCog },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, darkMode, onToggleDark, onLogout }: SidebarProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const projectsActive = currentPage === 'projects' || currentPage === 'tasks';
  const [projectsExpanded, setProjectsExpanded] = useState(projectsActive);

  const handleNavigate = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 flex items-center gap-2 rounded-lg bg-slate-900 py-2 pl-2 pr-3 text-white shadow-lg lg:hidden dark:bg-slate-800"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
        <img src={whiteLogo} alt="Zubkas" className="h-8 w-auto object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <span className="text-xs font-bold">Zubkas</span>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } dark:bg-slate-950`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img src={whiteLogo} alt="Zubkas Workspace" className="h-8 w-auto object-contain rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div>
              <h1 className="text-sm font-bold text-white">Zubkas Workspace</h1>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white lg:hidden" aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          <ul className="space-y-1">
            {navItems.map((item) => {
              if (item.key === 'settings') {
                if (user?.role !== 'admin' && !hasPermission(user?.permissions ?? {}, 'settings')) return null;
              } else {
                if (!hasPermission(user?.permissions ?? {}, item.key)) return null;
              }
              const Icon = item.icon;
              const active = currentPage === item.key;

              if (item.children) {
                const parentActive = projectsActive;
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => setProjectsExpanded((prev) => !prev)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        parentActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${parentActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {projectsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {projectsExpanded && (
                      <ul className="mt-1 space-y-0.5">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = currentPage === child.key;
                          return (
                            <li key={child.key}>
                              <button
                                onClick={() => handleNavigate(child.key)}
                                className={`flex w-full items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-sm transition-all ${
                                  childActive
                                    ? 'bg-white/10 font-medium text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <ChildIcon className={`h-4 w-4 ${childActive ? 'text-white' : 'text-slate-500'}`} />
                                {child.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleNavigate(item.key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-2 border-t border-slate-800 p-4">
          <button
            onClick={() => handleNavigate('profile')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              currentPage === 'profile'
                ? 'bg-[#9f0f0f] text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <User className={`h-5 w-5 ${currentPage === 'profile' ? 'text-white' : 'text-slate-500'}`} />
            Profile
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            onClick={onToggleDark}
            className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            <span className="flex items-center gap-2">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                darkMode ? 'bg-brand-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  darkMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-rose-600/10 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
