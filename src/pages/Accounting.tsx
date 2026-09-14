import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { TransactionModal } from '@/components/TransactionModal';
import { formatCurrency } from '@/utils/calculations';

export function Accounting() {
  const { db } = useWorkspace();
  const [modalOpen, setModalOpen] = useState(false);
  const income = useMemo(() => db.accounting.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0), [db.accounting]);
  const expenses = useMemo(() => db.accounting.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0), [db.accounting]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Accounting Transactions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Income syncs automatically when payments are logged</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Summary title="Total Income" value={income} icon={<TrendingUp className="h-5 w-5" />} color="emerald" />
        <Summary title="Total Expenses" value={expenses} icon={<TrendingDown className="h-5 w-5" />} color="rose" />
        <Summary title="Net Profit" value={income - expenses} icon={<TrendingUp className="h-5 w-5" />} color="brand" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {db.accounting.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...db.accounting].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{entry.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{entry.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{entry.reference || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                    <td className={`px-6 py-4 text-sm font-semibold capitalize ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No transactions yet</p>
            <p className="mt-1 text-sm text-slate-400">Add an income or expense transaction to get started.</p>
          </div>
        )}
      </div>
      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function Summary({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: 'emerald' | 'rose' | 'brand' }) {
  const styles = { emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400', brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400' };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${styles[color]}`}>{icon}</div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(value)}</p>
    </div>
  );
}
