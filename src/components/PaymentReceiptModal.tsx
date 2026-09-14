import { Printer } from 'lucide-react';
import type { Payment } from '@/types';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatCurrencyDetailed } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useSettings } from '@/context/SettingsContext';
import { downloadPdfFromElement } from '@/utils/printDocument';

interface PaymentReceiptModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export function PaymentReceiptModal({ payment, onClose }: PaymentReceiptModalProps) {
  const { db } = useWorkspace();
  const { settings, defaultPaymentAccount } = useSettings();
  const profile = settings.profile;
  if (!payment) return null;

  const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
  const client = db.clients.find((item) => item.id === payment.clientId);

  return (
    <Modal open={Boolean(payment)} onClose={onClose} title={`Payment Receipt · ${payment.paymentNumber}`} size="lg">
      <div id="printable-receipt-content" className="space-y-6">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              {profile.logo ? <img src={profile.logo} alt="Company Logo" className="h-10 w-auto" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">{profile.name?.charAt(0).toUpperCase() ?? 'Z'}</div>}
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{profile.name}</h3>
                <p className="text-xs text-slate-500">{profile.address}</p>
                <p className="text-xs text-slate-500">{profile.email} · {profile.phone}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900 dark:text-white">PAYMENT RECEIPT</p>
            <p className="text-sm text-slate-500">{payment.paymentNumber}</p>
            <p className="text-xs text-slate-400">{profile.taxLabel || settings.tax.name || 'Tax'}: {profile.taxNumber || profile.gstin || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Received From</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{client?.name ?? 'Unknown'}</p>
            <p className="text-slate-500">{client?.address}</p>
            <p className="text-slate-500">{profile.taxLabel || settings.tax.name || 'Tax'}: {client?.taxNumber || client?.gstin || '—'}</p>
          </div>
          <div className="text-right">
            <p><span className="text-slate-500">Receipt date: </span><span className="font-medium text-slate-800 dark:text-slate-200">{new Date(payment.date).toLocaleDateString('en-IN')}</span></p>
            <p><span className="text-slate-500">Invoice ref: </span><span className="font-medium text-slate-800 dark:text-slate-200">{invoice?.invoiceNumber ?? '-'}</span></p>
            <p><span className="text-slate-500">Method: </span><span className="font-medium text-slate-800 dark:text-slate-200">{payment.method}</span></p>
            <p><span className="text-slate-500">Reference: </span><span className="font-medium text-slate-800 dark:text-slate-200">{payment.reference || '-'}</span></p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Payment for {invoice?.invoiceNumber ?? 'invoice'}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrencyDetailed(payment.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white">
              <span>Total Received</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Bank Details</p>
          {defaultPaymentAccount ? (
            <div className="mt-1 space-y-0.5 text-slate-500">
              <p>{defaultPaymentAccount.bankName} · A/C {defaultPaymentAccount.accountNumber} · IFSC {defaultPaymentAccount.ifsc}</p>
              {defaultPaymentAccount.upiId && <p>UPI: {defaultPaymentAccount.upiId}</p>}
            </div>
          ) : (
            <p className="mt-1 text-slate-400">No bank account configured</p>
          )}
        </div>

        <div className="mt-8 pt-4 pb-12 text-center" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authorized Signatory: {profile.name}</p>
          <p className="mt-1 block text-[11px] text-slate-400">This is a computer-generated document.</p>
          <div style={{ height: '24px', width: '100%' }} />
        </div>
      </div>

      {/* Actions — outside printable area */}
      <div className="no-print flex justify-end gap-3 pt-4">
        <button onClick={() => downloadPdfFromElement('printable-receipt-content', payment.paymentNumber.replace(/\//g, '-'))} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <Printer className="h-4 w-4" /> Download PDF
        </button>
        <button onClick={onClose} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Close</button>
      </div>
    </Modal>
  );
}
