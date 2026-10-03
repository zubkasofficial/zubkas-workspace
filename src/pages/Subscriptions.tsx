import { CalendarDays, Pause, Play, Plus, Repeat, Search, Settings as SettingsIcon, Trash2, RefreshCw, FileText, TrendingUp, Calendar, DollarSign, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSubscriptionCategories } from '@/hooks/useSubscriptionCategories';
import { StatusBadge } from '@/components/StatusBadge';
import { SubscriptionCategoryModal } from '@/components/SubscriptionCategoryModal';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';
import { formatCurrency } from '@/utils/calculations';
import type { Subscription, SubscriptionStatus, Invoice } from '@/types';

const CATEGORY_PILL_COLORS = [
  'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
];

function getCategoryPill(category: string, categories: string[]): string {
  const index = categories.indexOf(category);
  return CATEGORY_PILL_COLORS[index % CATEGORY_PILL_COLORS.length] ?? CATEGORY_PILL_COLORS[0];
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN');
}

function monthlyAmount(sub: Subscription): number {
  if (sub.billingCycle === 'monthly') return sub.amount;
  if (sub.billingCycle === 'quarterly') return sub.amount / 3;
  if (sub.billingCycle === 'yearly') return sub.amount / 12;
  return sub.amount;
}

interface StatCardData {
  title: string;
  value: string;
  icon: typeof TrendingUp;
  color: 'brand' | 'emerald' | 'amber';
}

function StatCard({ title, value, icon: Icon, color }: StatCardData) {
  const styles = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function Subscriptions() {
  const { db, updateSubscriptionStatus, deleteSubscription, renewSubscription, generateInvoiceFromSubscription, syncSubscriptionsFromQuotations } = useWorkspace();
  const { showToast } = useToast();
  const { categories } = useSubscriptionCategories();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    syncSubscriptionsFromQuotations();
  }, [syncSubscriptionsFromQuotations, db.quotations]);

  useEffect(() => {
    const handler = () => syncSubscriptionsFromQuotations();
    window.addEventListener('subscriptions_updated', handler);
    return () => window.removeEventListener('subscriptions_updated', handler);
  }, [syncSubscriptionsFromQuotations]);

  const activeCount = useMemo(
    () => db.subscriptions.filter((s) => s.status === 'active').length,
    [db.subscriptions]
  );

  const mrr = useMemo(
    () => db.subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + monthlyAmount(s), 0),
    [db.subscriptions]
  );

  const arr = mrr * 12;

  const filtered = useMemo(() => db.subscriptions.filter((sub) => {
    const client = db.clients.find((c) => c.id === sub.clientId);
    const matchesSearch = `${sub.name} ${client?.name ?? ''} ${sub.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || sub.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [db.subscriptions, db.clients, search, categoryFilter]);

  const handlePause = (sub: Subscription) => {
    updateSubscriptionStatus(sub.id, 'paused');
    showToast('Subscription paused');
  };

  const handleResume = (sub: Subscription) => {
    updateSubscriptionStatus(sub.id, 'active');
    showToast('Subscription resumed');
  };

  const handleDelete = (sub: Subscription) => {
    deleteSubscription(sub.id);
    showToast('Subscription deleted');
  };

  const handleRenew = (sub: Subscription) => {
    renewSubscription(sub.id);
    showToast('Subscription renewed — next billing date updated');
  };

  const findLinkedInvoice = (sub: Subscription): Invoice | undefined =>
    db.invoices.find(
      (inv) =>
        inv.id === sub.invoiceId ||
        inv.subscriptionId === sub.id ||
        inv.referenceId === sub.id ||
        (inv.referenceId === sub.referenceId && sub.referenceId !== undefined) ||
        (inv.invoiceType === 'recurring' && inv.subscriptionCategory === sub.category && inv.clientId === sub.clientId)
    );

  const hasInvoice = (sub: Subscription): boolean =>
    Boolean(sub.invoiceId) ||
    sub.origin === 'quotation' ||
    db.invoices.some(
      (inv) =>
        inv.id === sub.invoiceId ||
        inv.subscriptionId === sub.id ||
        inv.referenceId === sub.id ||
        (inv.invoiceType === 'recurring' && inv.subscriptionCategory === sub.category && inv.clientId === sub.clientId)
    );

  const handleCreateInvoice = (sub: Subscription) => {
    const existing = findLinkedInvoice(sub);
    if (existing) {
      setPreviewInvoice(existing);
      return;
    }
    const invNum = generateInvoiceFromSubscription(sub.id);
    if (invNum) {
      showToast(`Invoice ${invNum} generated successfully`);
    } else {
      showToast('Could not create invoice', 'error');
    }
  };

  const handleViewInvoice = (sub: Subscription) => {
    const linked = findLinkedInvoice(sub);
    if (linked) setPreviewInvoice(linked);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recurring Subscriptions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.subscriptions.length} subscription{db.subscriptions.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <SettingsIcon className="h-4 w-4" /> Manage Categories
          </button>
          <button
            onClick={() => setSubModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add Subscription
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active Subscriptions" value={String(activeCount)} icon={Repeat} color="brand" />
        <StatCard title="Monthly Recurring Revenue" value={formatCurrency(mrr)} icon={DollarSign} color="emerald" />
        <StatCard title="Annual Recurring Revenue" value={formatCurrency(arr)} icon={Calendar} color="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscriptions or clients..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option>All</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Plan / Service</th>
                  <th className="px-6 py-3 font-semibold">Billing Period</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((sub) => {
                  const client = db.clients.find((c) => c.id === sub.clientId);
                  return (
                    <tr key={sub.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{client?.name ?? 'Unassigned'}</p>
                        <p className="mt-0.5 text-xs text-slate-400 capitalize">{sub.billingCycle} billing</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryPill(sub.category, categories)}`}>
                          {sub.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{sub.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(sub.startDate)} → {formatDate(sub.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(sub.amount)}</td>
                      <td className="px-6 py-4"><StatusBadge status={sub.status as SubscriptionStatus} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {hasInvoice(sub) ? (
                            <button
                              onClick={() => handleViewInvoice(sub)}
                              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              title="View Invoice"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Invoice
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCreateInvoice(sub)}
                              className="flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                              title="Create Invoice"
                            >
                              <FileText className="h-3.5 w-3.5" /> Create Invoice
                            </button>
                          )}
                          <button
                            onClick={() => handleRenew(sub)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                            title="Renew"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          {sub.status === 'paused' ? (
                            <button
                              onClick={() => handleResume(sub)}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                              title="Resume"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePause(sub)}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800"
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sub)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <Repeat className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                {db.subscriptions.length === 0 ? 'No subscriptions yet' : 'No subscriptions found'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {db.subscriptions.length === 0 ? 'Add a subscription or create one from a recurring quotation.' : 'Try adjusting your search or category filter.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing {filtered.length} of {db.subscriptions.length} subscriptions
        </div>
      </div>

      <SubscriptionCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} />
      <SubscriptionModal open={subModalOpen} onClose={() => setSubModalOpen(false)} />
      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        onLogPayment={() => { /* handled inside preview modal */ }}
      />
    </div>
  );
}
