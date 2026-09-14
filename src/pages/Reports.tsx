import { useMemo, useState } from 'react';
import { ChartBar as BarChart3, CircleDollarSign, Download, Receipt, TrendingUp } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency, getGstAmount, getInvoiceTotal, parseTransactionDate } from '@/utils/calculations';
import { StatCard } from '@/components/StatCard';
import { RevenueChart } from '@/components/RevenueChart';
import { StatusBadge } from '@/components/StatusBadge';
import { downloadPdfFromElement } from '@/utils/printDocument';

type PeriodFilter = 'week' | 'month' | 'year' | 'custom';

const FILTER_LABELS: Record<PeriodFilter, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

function getRangeBounds(filter: PeriodFilter, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (filter === 'week') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  if (filter === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end };
  }
  const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), 0, 1);
  const customEndDate = customEnd ? new Date(customEnd + 'T23:59:59') : end;
  return { start, end: customEndDate };
}

function isInDateRange(dateStr: string, start: Date, end: Date): boolean {
  const d = parseTransactionDate(dateStr);
  return d >= start && d <= end;
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} — ${fmt(end)}`;
}

export function Reports() {
  const { db } = useWorkspace();
  const { settings } = useSettings();
  const profile = settings.profile;

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = useMemo(
    () => getRangeBounds(periodFilter, customStart, customEnd),
    [periodFilter, customStart, customEnd],
  );

  const filteredAccounting = useMemo(
    () => db.accounting.filter((e) => isInDateRange(e.date, range.start, range.end)),
    [db.accounting, range],
  );

  const metrics = useMemo(() => {
    const income = filteredAccounting.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = filteredAccounting.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const tax = db.invoices
      .filter((invoice) => (invoice.status === 'Paid' || invoice.status === 'Partial') && isInDateRange(invoice.date, range.start, range.end))
      .reduce((s, invoice) => {
        const total = getInvoiceTotal(invoice.items);
        const taxablePortion = total > 0 ? (invoice.paidAmount / total) : 0;
        return s + getGstAmount(invoice.items) * taxablePortion;
      }, 0);
    return { income, expense, tax, profit: income - expense };
  }, [filteredAccounting, db.invoices, range]);

  const monthly = useMemo(() => {
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

  const sortedTransactions = useMemo(() =>
    [...filteredAccounting]
      .sort((a, b) => parseTransactionDate(b.date).getTime() - parseTransactionDate(a.date).getTime())
      .slice(0, 10),
  [filteredAccounting]);

  const invoiceSummary = useMemo(() => {
    return (['Paid', 'Partial', 'Unpaid', 'Overdue'] as const).map((status) => {
      const invoices = db.invoices.filter((inv) => inv.status === status && isInDateRange(inv.date, range.start, range.end));
      return {
        status,
        count: invoices.length,
        amount: invoices.reduce((s, inv) => s + getInvoiceTotal(inv.items), 0),
      };
    });
  }, [db.invoices, range]);

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadPdfFromElement('printable-report-content', `Zubkas-Business-Report-${today}`);
  };

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Business Reports</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live financial insights from your workspace records</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            {(['week', 'month', 'year', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setPeriodFilter(filter)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  periodFilter === filter
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
          {/* Export PDF */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-[#9f0f0f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#850c0c]"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {periodFilter === 'custom' && (
        <div className="no-print flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <p className="text-xs text-slate-400">Showing data for: {formatDateRange(range.start, range.end)}</p>
        </div>
      )}

      {/* Printable Report Content */}
      <div id="printable-report-content" className="space-y-6 rounded-2xl bg-white p-6">
        {/* Report Header */}
        <div className="flex items-center gap-4 border-b-2 border-slate-300 pb-4">
          {profile.logo ? <img src={profile.logo} alt="Company Logo" className="h-16 w-auto" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">{profile.name?.charAt(0).toUpperCase() ?? 'Z'}</div>}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-600">{profile.address}</p>
            <p className="text-sm text-slate-600">{profile.taxLabel || settings.tax.name || 'Tax'}: {profile.taxNumber || profile.gstin || '—'}</p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Financial Performance Report</h2>
          <p className="text-sm text-slate-600">Date Range: {formatDateRange(range.start, range.end)}</p>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Income" value={formatCurrency(metrics.income)} icon={CircleDollarSign} color="emerald" />
          <StatCard title="Total Expense" value={formatCurrency(metrics.expense)} icon={Receipt} color="rose" />
          <StatCard title="Net Profit" value={formatCurrency(metrics.profit)} icon={TrendingUp} color="brand" />
          <StatCard title="Tax Collected" value={formatCurrency(metrics.tax)} icon={BarChart3} color="amber" />
        </div>

        {/* Chart */}
        <RevenueChart data={monthly} />

        {/* Invoice Summary + Transactions */}
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Invoice Summary</h3>
            <p className="mt-0.5 text-sm text-slate-500">Tax collected from paid and partial invoices</p>
            <div className="mt-4 space-y-3">
              {invoiceSummary.map(({ status, count, amount }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    <span className="text-sm text-slate-500">{count} invoice{count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(amount)}</span>
                </div>
              ))}
              {db.invoices.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">No invoices yet</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
            <p className="mt-0.5 text-sm text-slate-500">Latest income and expense entries</p>
            <div className="mt-4 overflow-x-auto">
              {sortedTransactions.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                      <th className="pb-2 font-semibold">Description</th>
                      <th className="pb-2 font-semibold">Type</th>
                      <th className="pb-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTransactions.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2.5 text-sm text-slate-700">{entry.description}</td>
                        <td className="py-2.5">
                          <span className={`text-xs font-semibold capitalize ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type}</span>
                        </td>
                        <td className={`py-2.5 text-right text-sm font-semibold ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(entry.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">No transactions in this period</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div className="mt-8 border-t border-slate-300 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} &bull; Zubkas Workspace
          </p>
        </div>
      </div>

      {/* Report Notes — not included in PDF */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-slate-900 dark:text-white">Report Notes</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Total Income sums all income entries from payments and manual transactions. Tax Collected is calculated proportionally from the GST on paid and partial invoices. These figures update instantly when you log a payment or add a transaction. Use the period filter to narrow results to a specific week, month, year, or custom date range.
        </p>
      </div>
    </div>
  );
}
