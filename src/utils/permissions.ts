import type { PageKey } from '@/components/Sidebar';

export const PERMISSION_KEYS: PageKey[] = [
  'dashboard',
  'clients',
  'quotations',
  'invoices',
  'payments',
  'accounting',
  'projects',
  'tasks',
  'subscriptions',
  'reports',
  'employees',
  'settings',
];

export const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  quotations: 'Quotations',
  invoices: 'Invoices',
  payments: 'Payments',
  accounting: 'Accounting',
  projects: 'Projects',
  tasks: 'Tasks',
  subscriptions: 'Subscriptions',
  reports: 'Reports',
  employees: 'Employees (Staff Access)',
  settings: 'Settings',
};

export function getAllPermissions(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) result[key] = true;
  return result;
}

export function getNoPermissions(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) result[key] = false;
  return result;
}

export function hasPermission(
  permissions: Record<string, boolean>,
  key: string,
): boolean {
  return Boolean(permissions[key]);
}
