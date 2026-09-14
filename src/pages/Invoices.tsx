import { Download, Eye, MoveHorizontal as MoreHorizontal, Plus, Search, SlidersHorizontal, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { StatusBadge } from '@/components/StatusBadge';
import { InvoiceModal } from '@/components/InvoiceModal';
import { PaymentModal } from '@/components/PaymentModal';
import { InvoicePreviewModal } from '@/components/InvoicePreviewModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency, getInvoiceBalance, getInvoiceTotal } from '@/utils/calculations';
import type { Invoice, InvoiceStatus } from '@/types';

export function Invoices() {
  const { db, updateInvoiceStatus, deleteInvoice } = useWorkspace();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const invoices = useMemo(() => db.invoices.filter((invoice) => {
    const client = db.clients.find((item) => item.id === invoice.clientId);
    const matchesSearch = `${invoice.invoiceNumber} ${client?.name ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'All' || invoice.status === status);
  }), [db, search, status]);

  const linkedPaymentsCount = (invoiceId: string) =>
    db.payments.filter((p) => p.invoiceId === invoiceId).length;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteInvoice(deleteTarget.id);
    showToast('Invoice deleted successfully');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Invoices</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.invoices.length} invoices in your workspace</p>
        </div>
        <button onClick={() => setInvoiceOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices or clients..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <option>All</option><option>Paid</option><option>Partial</option><option>Unpaid</option><option>Overdue</option>
            </select>
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filter</span>
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-6 py-3 font-semibold">Invoice</th>
                <th className="px-6 py-3 font-semibold">Client</th>
                <th className="px-6 py-3 font-semibold">Issue Date</th>
                <th className="px-6 py-3 font-semibold">Due Date</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Balance</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((invoice) => {
                const client = db.clients.find((item) => item.id === invoice.clientId);
                const total = getInvoiceTotal(invoice.items);
                const payCount = linkedPaymentsCount(invoice.id);
                return (
                  <tr key={invoice.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm font-semibold text-brand-600 dark:text-brand-400">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{client?.name ?? 'Unknown client'}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{client?.gstin}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(total)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-amber-600">{formatCurrency(getInvoiceBalance(invoice))}</td>
                    <td className="px-6 py-4">
                      <select value={invoice.status} onChange={(event) => { const result = updateInvoiceStatus(invoice.id, event.target.value as InvoiceStatus); if (result?.projectCreated) showToast('Project automatically created for this invoice!'); }} className="rounded-full border-0 bg-transparent p-0 text-xs font-semibold text-slate-600 outline-none dark:text-slate-300">
                        <option>Paid</option><option>Partial</option><option>Unpaid</option><option>Overdue</option>
                      </select>
                      <div className="mt-1"><StatusBadge status={invoice.status} /></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPayment(invoice)} className="flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                          <Wallet className="h-3.5 w-3.5" /> Log Payment
                        </button>
                        <button onClick={() => setPreview(invoice)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="View / PDF">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="More actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(invoice)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" title="Delete invoice">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {invoices.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{db.invoices.length === 0 ? 'No invoices yet' : 'No invoices found'}</p>
            <p className="mt-1 text-sm text-slate-400">{db.invoices.length === 0 ? 'Create your first invoice to get started.' : 'Try adjusting your search or filters.'}</p>
          </div>
        )}

        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing {invoices.length} of {db.invoices.length} invoices
        </div>
      </div>

      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} />
      <PaymentModal invoice={payment} onClose={() => setPayment(null)} />
      <InvoicePreviewModal invoice={preview} onClose={() => setPreview(null)} onLogPayment={() => { setPayment(preview); setPreview(null); }} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Invoice?"
        message={
          <>
            <p>Are you sure you want to delete invoice <span className="font-semibold text-slate-800 dark:text-slate-100">{deleteTarget?.invoiceNumber}</span>?</p>
            {deleteTarget && linkedPaymentsCount(deleteTarget.id) > 0 && (
              <p className="mt-2 text-rose-600 dark:text-rose-400">
                This will also remove {linkedPaymentsCount(deleteTarget.id)} associated payment record{linkedPaymentsCount(deleteTarget.id) !== 1 ? 's' : ''} and their synced income entries.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
