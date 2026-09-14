import { ArrowUpRight, CircleDollarSign, FileText, Users, Wallet, MoveHorizontal as MoreHorizontal, SquareCheck as CheckSquare, CalendarClock, TriangleAlert as AlertTriangle, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { StatCard } from '@/components/StatCard';
import { RevenueChart } from '@/components/RevenueChart';
import { StatusBadge } from '@/components/StatusBadge';
import { parseTransactionDate } from '@/utils/calculations';
import { useProjectTasks, isOverdue, isDueToday, isUpcoming, type ProjectTask } from '@/hooks/useProjectTasks';
import type { PageKey } from '@/components/Sidebar';

const formatCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

const getInvoiceTotal = (items: { quantity: number; rate: number }[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  return subtotal * 1.18;
};

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
}

type TaskTab = 'today' | 'overdue' | 'upcoming';

const TAB_LABELS: Record<TaskTab, string> = {
  today: "Today's Tasks",
  overdue: 'Overdue Tasks',
  upcoming: 'Upcoming Tasks',
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const { db } = useWorkspace();
  const { tasks, toggleTask } = useProjectTasks();
  const [taskTab, setTaskTab] = useState<TaskTab>('overdue');

  const metrics = useMemo(() => {
    const invoiced = db.invoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice.items), 0);
    const received = db.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = db.invoices
      .filter((invoice) => invoice.status !== 'Paid')
      .reduce((sum, invoice) => sum + getInvoiceTotal(invoice.items), 0) -
      db.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return { invoiced, received, outstanding };
  }, [db]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const month = d.getMonth();
      const year = d.getFullYear();
      const income = db.payments
        .filter((p) => { const pd = parseTransactionDate(p.date); return pd.getMonth() === month && pd.getFullYear() === year; })
        .reduce((s, p) => s + p.amount, 0);
      const expense = db.accounting
        .filter((e) => e.type === 'expense' && (() => { const ed = parseTransactionDate(e.date); return ed.getMonth() === month && ed.getFullYear() === year; })())
        .reduce((s, e) => s + e.amount, 0);
      months.push({ label, income, expense });
    }
    return months;
  }, [db.payments, db.accounting]);

  const hasData = db.invoices.length > 0 || db.payments.length > 0 || db.clients.length > 0;

  const todaysTasks = useMemo(() => tasks.filter(isDueToday), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const upcomingTasks = useMemo(() => tasks.filter(isUpcoming), [tasks]);

  const tabTasks: Record<TaskTab, ProjectTask[]> = {
    today: todaysTasks,
    overdue: overdueTasks,
    upcoming: upcomingTasks,
  };

  const tabCounts = {
    today: todaysTasks.length,
    overdue: overdueTasks.length,
    upcoming: upcomingTasks.length,
  };

  const activeTabTasks = tabTasks[taskTab];
  const hasAnyTasks = tasks.length > 0;
  const hasActiveTasks = tabCounts.today > 0 || tabCounts.overdue > 0 || tabCounts.upcoming > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(metrics.received)} icon={CircleDollarSign} trend={hasData ? '12.5%' : undefined} trendUp color="brand" />
        <StatCard title="Outstanding" value={formatCurrency(Math.max(metrics.outstanding, 0))} icon={Wallet} trend={hasData ? '4.2%' : undefined} trendUp color="amber" />
        <StatCard title="Total Invoices" value={String(db.invoices.length)} icon={FileText} trend={hasData ? '8.1%' : undefined} trendUp color="emerald" />
        <StatCard title="Active Clients" value={String(db.clients.length)} icon={Users} trend={hasData ? '2.4%' : undefined} trendUp color="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Invoice Summary</h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Current billing status</p>
            </div>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {(['Paid', 'Partial', 'Unpaid', 'Overdue'] as const).map((status) => {
              const count = db.invoices.filter((invoice) => invoice.status === status).length;
              const amount = db.invoices.filter((invoice) => invoice.status === status).reduce((sum, invoice) => sum + getInvoiceTotal(invoice.items), 0);
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><StatusBadge status={status} /><span className="text-sm text-slate-500 dark:text-slate-400">{count} invoice{count !== 1 ? 's' : ''}</span></div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(amount)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">Total invoiced</span><span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.invoiced)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Invoices */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div><h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Invoices</h3><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your latest billing activity</p></div>
            {db.invoices.length > 0 && <button onClick={() => onNavigate('invoices')} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">View all <ArrowUpRight className="h-4 w-4" /></button>}
          </div>
          <div className="overflow-x-auto">
            {db.invoices.length > 0 ? (
              <table className="w-full min-w-[400px] text-left"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800"><th className="px-6 py-3 font-semibold">Invoice</th><th className="px-6 py-3 font-semibold">Client</th><th className="px-6 py-3 font-semibold">Amount</th><th className="px-6 py-3 font-semibold">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{db.invoices.slice(0, 4).map((invoice) => <tr key={invoice.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{invoice.invoiceNumber}</td><td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{db.clients.find((client) => client.id === invoice.clientId)?.name ?? 'Unknown client'}</td><td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(getInvoiceTotal(invoice.items))}</td><td className="px-6 py-4"><StatusBadge status={invoice.status} /></td></tr>)}</tbody></table>
            ) : (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">No invoices yet</p>
                <p className="mt-1 text-sm text-slate-400">Create your first invoice to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Actionable Tasks */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Actionable Tasks</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Stay on top of your deadlines</p>
              </div>
            </div>
            {hasAnyTasks && <button onClick={() => onNavigate('projects')} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Projects <ArrowUpRight className="h-4 w-4" /></button>}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
            {(['overdue', 'today', 'upcoming'] as const).map((tab) => {
              const count = tabCounts[tab];
              const icon = tab === 'overdue' ? AlertTriangle : tab === 'today' ? Clock : CalendarClock;
              const Icon = icon;
              const active = taskTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setTaskTab(tab)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? tab === 'overdue' && count > 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        : 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                      : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {TAB_LABELS[tab]}
                  {count > 0 && (
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/80 dark:bg-slate-900/50' : 'bg-slate-100 dark:bg-slate-700'} text-slate-600 dark:text-slate-300`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Task List */}
          <div className="max-h-[320px] overflow-y-auto px-4 py-3 scrollbar-thin">
            {activeTabTasks.length > 0 ? (
              <div className="space-y-2">
                {activeTabTasks.map((task) => (
                  <DashboardTaskRow key={task.id} task={task} onToggle={toggleTask} overdue={taskTab === 'overdue'} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="h-10 w-10 text-emerald-300 dark:text-emerald-700" />
                <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">All caught up!</p>
                <p className="mt-1 text-sm text-slate-400">No {taskTab === 'today' ? "today's" : taskTab} tasks pending.</p>
              </div>
            )}
          </div>

          {!hasActiveTasks && hasAnyTasks && (
            <div className="border-t border-slate-100 px-6 py-3 text-center dark:border-slate-800">
              <p className="text-xs text-slate-400">All caught up! No overdue or pending tasks for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTaskRow({ task, onToggle, overdue }: { task: ProjectTask; onToggle: (id: string) => void; overdue: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
      <button
        onClick={() => onToggle(task.id)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 transition-all hover:border-brand-500 dark:border-slate-600"
        aria-label="Mark complete"
      >
        <span className="h-2 w-2 rounded-sm bg-transparent transition-all" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
        <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {task.project_name} · {task.client_name}
        </span>
      </div>
      <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
        <CalendarClock className="h-3 w-3" />
        {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </span>
    </div>
  );
}
