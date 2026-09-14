import type { InvoiceStatus, ProjectStatus, QuotationStatus } from '@/types';

type BadgeValue = InvoiceStatus | ProjectStatus | QuotationStatus | 'active' | 'paused' | 'cancelled' | 'expired';

const styles: Record<BadgeValue, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize',
  Unpaid: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Not Started': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Partial: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'In Review': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 capitalize',
  paused: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize',
  expired: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 capitalize',
};

export function StatusBadge({ status }: { status: BadgeValue }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}
