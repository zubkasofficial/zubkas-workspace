import { Printer } from 'lucide-react';
import type { Quotation } from '@/types';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatCurrencyDetailed, getSubtotal } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useSettings } from '@/context/SettingsContext';
import { downloadPdfFromElement } from '@/utils/printDocument';

interface QuotationPreviewModalProps {
  quotation: Quotation | null;
  onClose: () => void;
}

export function QuotationPreviewModal({ quotation, onClose }: QuotationPreviewModalProps) {
  const { db } = useWorkspace();
  const { settings, defaultPaymentAccount } = useSettings();
  const profile = settings.profile;

  if (!quotation) return null;

  const client = db.clients.find((c) => c.id === quotation.clientId);
  const subtotal = getSubtotal(quotation.items);
  const taxRate = settings.tax.rate || 18;
  const taxAmount = (subtotal * taxRate) / 100;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const total = subtotal + taxAmount;
  const isSubscription = quotation.quotationType === 'subscription';
  const taxLabel = profile.taxLabel || settings.tax.name || 'Tax';
  const isGst = taxLabel.toUpperCase() === 'GST';

  return (
    <Modal open={Boolean(quotation)} onClose={onClose} title={`Quotation Preview · ${quotation.quoteNumber}`} size="lg">
      <div id="printable-quotation-content" className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img src="/zubkas-logo.png" alt="Zubkas Logo" className="h-12 w-auto shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{profile.name}</h3>
              <p className="text-xs text-slate-500">{profile.address}</p>
              <p className="text-xs text-slate-500">{profile.email} · {profile.phone}</p>
              <p className="text-xs text-slate-500">{taxLabel}: {profile.taxNumber || profile.gstin || '—'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900 dark:text-white">QUOTATION</p>
            <p className="text-sm text-slate-500">{quotation.quoteNumber}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${isSubscription ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              {isSubscription ? 'Subscription' : 'Service'}
            </span>
          </div>
        </div>

        {/* Meta + Client */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Quote Date</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(quotation.date).toLocaleDateString('en-IN')}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Valid Until</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(quotation.validUntil).toLocaleDateString('en-IN')}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation For</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{client?.name ?? 'Unknown'}</p>
            <p className="text-slate-500">{client?.address}</p>
            <p className="text-slate-500">{taxLabel}: {client?.taxNumber || client?.gstin || '—'}</p>
          </div>
        </div>

        {/* Subscription details */}
        {isSubscription && quotation.subscriptionCategory && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-800 dark:text-blue-300">{quotation.subscriptionCategory}</span>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Billing Period: {quotation.subscriptionStartDate ? new Date(quotation.subscriptionStartDate).toLocaleDateString('en-IN') : '—'} to {quotation.subscriptionEndDate ? new Date(quotation.subscriptionEndDate).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
        )}

        {/* Line Items */}
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quotation.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{item.description}</td>
                  <td className="px-3 py-3 text-center text-slate-500">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{formatCurrencyDetailed(item.rate)}</td>
                  <td className="px-3 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrencyDetailed(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {isGst ? <><div className="flex justify-between text-slate-500"><span>CGST ({taxRate / 2}%)</span><span>{formatCurrency(cgst)}</span></div><div className="flex justify-between text-slate-500"><span>SGST ({taxRate / 2}%)</span><span>{formatCurrency(sgst)}</span></div></> : <div className="flex justify-between text-slate-500"><span>{taxLabel} ({taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-700 dark:text-white"><span>Grand Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Notes</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{quotation.notes}</p>
          </div>
        )}

        {/* Terms & Bank Details */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Terms &amp; Conditions</p>
            <ol className="space-y-1 text-xs text-slate-500">
              {settings.terms.map((term, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="font-semibold text-slate-400">{i + 1}.</span>
                  <span>{term}</span>
                </li>
              ))}
              {settings.terms.length === 0 && <li className="text-slate-400">No terms specified</li>}
            </ol>
          </div>
          {(quotation.showBankDetails !== false || quotation.showUpiDetails !== false) && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payment Details</p>
              {defaultPaymentAccount ? (
                <div className="space-y-1 text-xs text-slate-500">
                  {quotation.showBankDetails !== false && (
                    <>
                      <p><span className="font-medium">Bank:</span> {defaultPaymentAccount.bankName}</p>
                      <p><span className="font-medium">A/C:</span> {defaultPaymentAccount.accountNumber}</p>
                      <p><span className="font-medium">IFSC:</span> {defaultPaymentAccount.ifsc}</p>
                      {defaultPaymentAccount.branchName && <p><span className="font-medium">Branch:</span> {defaultPaymentAccount.branchName}</p>}
                    </>
                  )}
                  {quotation.showUpiDetails !== false && (
                    <>
                      {defaultPaymentAccount.upiId && <p><span className="font-medium">UPI:</span> {defaultPaymentAccount.upiId}</p>}
                      {defaultPaymentAccount.qrCode && (
                        <img src={defaultPaymentAccount.qrCode} alt="UPI QR Code" className="mt-1 h-20 w-20 rounded-md border border-slate-200 object-contain dark:border-slate-700" />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No account configured</p>
              )}
            </div>
          )}
        </div>

        {/* Signatory */}
        <div className="mt-8 pt-4 pb-12 text-center" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authorized Signatory: {profile.name}</p>
          <p className="mt-1 block text-[11px] text-slate-400">This is a computer-generated document.</p>
          <div style={{ height: '24px', width: '100%' }} />
        </div>
      </div>

      {/* Actions — outside printable area */}
      <div className="no-print flex justify-end gap-3 pt-4">
        <button onClick={() => downloadPdfFromElement('printable-quotation-content', quotation.quoteNumber.replace(/\//g, '-'))} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <Printer className="h-4 w-4" /> Download PDF
        </button>
        <button onClick={onClose} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Close</button>
      </div>
    </Modal>
  );
}
