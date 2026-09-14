import { ArrowRight, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useSettings } from '@/context/SettingsContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ClientModal } from '@/components/ClientModal';
import { QuotationModal } from '@/components/QuotationModal';
import { QuotationPreviewModal } from '@/components/QuotationPreviewModal';
import { PaymentReceiptModal } from '@/components/PaymentReceiptModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { Settings } from '@/pages/Settings';
import type { Client, Payment, Quotation } from '@/types';
import type { PageKey } from '@/components/Sidebar';

interface GenericPageProps { page: Exclude<PageKey, 'dashboard' | 'invoices' | 'accounting' | 'projects' | 'tasks' | 'reports' | 'employees' | 'profile'> }
const titles: Record<GenericPageProps['page'], string> = { clients: 'Client Directory', quotations: 'Quotation Pipeline', payments: 'Payment Ledger', subscriptions: 'Recurring Costs', settings: 'Workspace Settings' };
const subtitles: Record<GenericPageProps['page'], string> = { clients: 'Manage your client relationships', quotations: 'Create and track price quotes', payments: 'View payment history and ledger', subscriptions: 'Track recurring software costs', settings: 'Configure your workspace preferences' };
const currency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export function GenericPage({ page }: GenericPageProps) {
  const [search, setSearch] = useState('');
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [deleteQuotationTarget, setDeleteQuotationTarget] = useState<Quotation | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<Payment | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClientTarget, setDeleteClientTarget] = useState<Client | null>(null);
  const { showToast } = useToast();
  const { db, deleteQuotation, deletePayment, deleteClient } = useWorkspace();

  if (page === 'settings') return <Settings />;

  const isClients = page === 'clients';
  const isQuotations = page === 'quotations';

  const confirmDeleteQuotation = () => {
    if (!deleteQuotationTarget) return;
    deleteQuotation(deleteQuotationTarget.id);
    showToast('Quotation deleted successfully');
    setDeleteQuotationTarget(null);
  };

  const confirmDeletePayment = () => {
    if (!deletePaymentTarget) return;
    deletePayment(deletePaymentTarget.id);
    showToast('Payment deleted & invoice balance reverted');
    setDeletePaymentTarget(null);
  };

  const clientHasRecords = (clientId: string) => {
    const hasUnpaidInvoices = db.invoices.some((inv) => inv.clientId === clientId && inv.status !== 'Paid');
    const hasActiveProjects = db.projects.some((proj) => proj.clientId === clientId && proj.status !== 'Completed');
    return hasUnpaidInvoices || hasActiveProjects;
  };

  const confirmDeleteClient = () => {
    if (!deleteClientTarget) return;
    deleteClient(deleteClientTarget.id);
    showToast('Client deleted successfully');
    setDeleteClientTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{titles[page]}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitles[page]}</p>
        </div>
        {(isClients || isQuotations) && (
          <button
            onClick={() => isClients ? (setEditingClient(null), setClientModalOpen(true)) : setQuotationModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> {isClients ? 'Add Client' : 'New Quotation'}
          </button>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {page === 'clients' && <Clients query={search} onEdit={(client) => { setEditingClient(client); setClientModalOpen(true); }} onDelete={setDeleteClientTarget} />}
          {page === 'quotations' && <Quotations onDelete={setDeleteQuotationTarget} onView={setPreviewQuotation} />}
          {page === 'payments' && <Payments onViewReceipt={setReceiptPayment} onDelete={setDeletePaymentTarget} />}
          {page === 'subscriptions' && <Subscriptions />}
        </div>
      </div>
      <ClientModal open={clientModalOpen} editingClient={editingClient} onClose={() => { setClientModalOpen(false); setEditingClient(null); }} />
      <QuotationModal open={quotationModalOpen} onClose={() => setQuotationModalOpen(false)} />
      <QuotationPreviewModal quotation={previewQuotation} onClose={() => setPreviewQuotation(null)} />
      <PaymentReceiptModal payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
      <ConfirmDialog
        open={Boolean(deleteQuotationTarget)}
        title="Delete Quotation?"
        message={
          <>
            <p>Are you sure you want to delete quotation <span className="font-semibold text-slate-800 dark:text-slate-100">{deleteQuotationTarget?.quoteNumber}</span>?</p>
            <p className="mt-2 text-xs text-slate-400">This will also remove any linked subscription. This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDeleteQuotation}
        onCancel={() => setDeleteQuotationTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteClientTarget)}
        title="Delete Client?"
        message={
          <>
            <p>Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-100">{deleteClientTarget?.name}</span>?</p>
            {deleteClientTarget && clientHasRecords(deleteClientTarget.id) && (
              <p className="mt-2 text-amber-600 dark:text-amber-400">This client has existing records in your workspace.</p>
            )}
            <p className="mt-2 text-xs text-slate-400">This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDeleteClient}
        onCancel={() => setDeleteClientTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(deletePaymentTarget)}
        title="Delete Payment Record?"
        message={
          <>
            <p>Are you sure you want to delete payment <span className="font-semibold text-slate-800 dark:text-slate-100">{deletePaymentTarget?.paymentNumber}</span>?</p>
            <p className="mt-2 text-amber-600 dark:text-amber-400">The linked invoice's paid amount and balance will be reverted, and the synced income transaction will be removed from accounting.</p>
            <p className="mt-2 text-xs text-slate-400">This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDeletePayment}
        onCancel={() => setDeletePaymentTarget(null)}
      />
    </div>
  );
}

function Clients({ query, onEdit, onDelete }: { query: string; onEdit: (client: Client) => void; onDelete: (client: Client) => void }) {
  const { db } = useWorkspace();
  const { settings } = useSettings();
  const taxName = settings.profile.taxLabel || settings.tax.name || 'Tax';
  const rows = db.clients.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <SimpleTable
      headers={['Client', 'Contact', `${taxName} Number`, 'Added', 'Actions']}
      emptyMessage="No clients yet"
      rows={rows.map((item) => [
        <><p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-xs text-slate-400">{item.address}</p></>,
        <><p className="text-slate-600 dark:text-slate-300">{item.email}</p><p className="text-slate-500">{item.phone}</p></>,
        <span className="text-slate-600 dark:text-slate-300">{item.taxNumber || item.gstin || '—'}</span>,
        <span className="text-slate-600 dark:text-slate-300">{new Date(item.createdAt).toLocaleDateString('en-IN')}</span>,
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(item)} className="p-2 rounded-lg text-slate-400 transition-colors hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit client">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(item)} className="p-2 rounded-lg text-slate-400 transition-colors hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20" title="Delete client">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>,
      ])}
    />
  );
}

function Quotations({ onDelete, onView }: { onDelete: (q: Quotation) => void; onView: (q: Quotation) => void }) {
  const { db, convertQuotationToInvoice } = useWorkspace();
  const { showToast } = useToast();
  return (
    <SimpleTable
      headers={['Quotation', 'Type', 'Client', 'Valid Until', 'Value', 'Status', 'Action']}
      emptyMessage="No quotations yet"
      rows={db.quotations.map((item) => {
        const isSubscription = item.quotationType === 'subscription';
        return [
          <div>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{item.quoteNumber}</span>
          </div>,
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isSubscription ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
            {isSubscription ? 'Subscription' : 'Service'}
          </span>,
          <span className="text-slate-600 dark:text-slate-300">{db.clients.find((client) => client.id === item.clientId)?.name ?? 'Unknown'}</span>,
          <span className="text-slate-600 dark:text-slate-300">{new Date(item.validUntil).toLocaleDateString('en-IN')}</span>,
          <span className="font-semibold text-slate-800 dark:text-slate-200">{currency(item.items.reduce((sum, line) => sum + line.quantity * line.rate, 0) * 1.18)}</span>,
          <StatusBadge status={item.status} />,
          <div className="flex items-center gap-2">
            <button
              onClick={() => { convertQuotationToInvoice(item.id); showToast('Quotation converted to invoice'); }}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Convert <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onView(item)}
              title="View Quotation"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
              title="Delete quotation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>,
        ];
      })}
    />
  );
}

function Payments({ onViewReceipt, onDelete }: { onViewReceipt: (payment: Payment) => void; onDelete: (payment: Payment) => void }) {
  const { db } = useWorkspace();
  return (
    <SimpleTable
      headers={['Receipt #', 'Invoice', 'Client', 'Date', 'Method', 'Amount', 'Action']}
      emptyMessage="No payments yet"
      rows={db.payments.map((item) => [
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.paymentNumber}</span>,
        <span className="text-slate-600 dark:text-slate-300">{db.invoices.find((invoice) => invoice.id === item.invoiceId)?.invoiceNumber ?? '-'}</span>,
        <span className="text-slate-600 dark:text-slate-300">{db.clients.find((client) => client.id === item.clientId)?.name ?? '-'}</span>,
        <span className="text-slate-600 dark:text-slate-300">{new Date(item.date).toLocaleDateString('en-IN')}</span>,
        <span className="text-slate-600 dark:text-slate-300">{item.method}</span>,
        <span className="font-semibold text-slate-800 dark:text-slate-200">{currency(item.amount)}</span>,
        <div className="flex items-center gap-1.5">
          <button onClick={() => onViewReceipt(item)} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700">
            <Eye className="h-3.5 w-3.5" /> View Receipt
          </button>
          <button
            onClick={() => onDelete(item)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
            title="Delete payment"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>,
      ])}
    />
  );
}

function Subscriptions() {
  const { db } = useWorkspace();
  return (
    <SimpleTable
      headers={['Subscription', 'Category', 'Cycle', 'Next Billing', 'Amount', 'Status']}
      emptyMessage="No subscriptions yet"
      rows={db.subscriptions.map((item) => [
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>,
        <span className="text-slate-600 dark:text-slate-300">{item.category}</span>,
        <span className="text-slate-600 dark:text-slate-300">{item.billingCycle}</span>,
        <span className="text-slate-600 dark:text-slate-300">{new Date(item.nextBillingDate).toLocaleDateString('en-IN')}</span>,
        <span className="font-semibold text-slate-800 dark:text-slate-200">{currency(item.amount)}</span>,
        <StatusBadge status={item.status} />,
      ])}
    />
  );
}

function SimpleTable({ headers, rows, emptyMessage }: { headers: string[]; rows: (string | JSX.Element)[][]; emptyMessage?: string }) {
  if (rows.length === 0) return <div className="px-6 py-12 text-center"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{emptyMessage ?? 'No records found'}</p></div>;
  return (
    <table className="w-full min-w-[650px] text-left">
      <thead>
        <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
          {headers.map((header) => <th key={header} className="px-6 py-3 font-semibold">{header}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, index) => (
          <tr key={index} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            {row.map((cell, cellIndex) => <td key={cellIndex} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
