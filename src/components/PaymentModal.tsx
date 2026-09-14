import { useState } from 'react';
import type { Invoice, PaymentMethod } from '@/types';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { formatCurrency, getInvoiceBalance, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';

interface PaymentModalProps { invoice: Invoice | null; onClose: () => void; }

export function PaymentModal({ invoice, onClose }: PaymentModalProps) {
  const { logPayment } = useWorkspace();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState('');
  if (!invoice) return null;
  const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0) * 1.18;
  const balance = getInvoiceBalance(invoice);
  const received = total - balance;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || value > balance) { showToast(`Enter an amount up to ${formatCurrency(balance)}`, 'error'); return; }
    const result = logPayment(invoice.id, { amount: value, method, date, reference });
    onClose();
    if (result) {
      showToast('Payment recorded successfully');
      if (result.projectCreated) showToast('Project automatically created for this invoice!');
    }
    setAmount('');
    setReference('');
  };
  return <Modal open={Boolean(invoice)} onClose={onClose} title={`Log Payment · ${invoice.invoiceNumber}`}><div className="mb-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Invoice Total</p><p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</p></div><div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20"><p className="text-xs text-emerald-700 dark:text-emerald-400">Received</p><p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(received)}</p></div><div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20"><p className="text-xs text-amber-700 dark:text-amber-400">Balance Due</p><p className="mt-1 text-base font-bold text-amber-700 dark:text-amber-400">{formatCurrency(balance)}</p></div></div><form onSubmit={submit} className="space-y-4"><div><label className={labelClass}>Payment Amount</label><input required type="number" min="1" max={balance} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={String(Math.round(balance))} className={inputClass} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Payment Method</label><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Cheque</option></select></div><div><label className={labelClass}>Payment Date</label><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></div></div><div><label className={labelClass}>Reference</label><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transaction ID or cheque number" className={inputClass} /></div><div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Save Payment</button></div></form></Modal>;
}
