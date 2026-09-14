import { Plus, Receipt, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Invoice, InvoiceItem } from '@/types';
import { inputClass, labelClass } from '@/components/Modal';
import { formatCurrency, formatCurrencyDetailed, generateId, generateInvoiceNumber, getSubtotal, newInvoiceItem, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

type DiscountUnit = 'flat' | 'percent';

const sectionCard = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50';
const smallInput = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export function InvoiceModal({ open, onClose }: InvoiceModalProps) {
  const { db, addInvoice } = useWorkspace();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const paymentAccounts = settings.paymentAccounts;
  const taxSettings = settings.tax;

  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([newInvoiceItem()]);
  const [applyTax, setApplyTax] = useState(taxSettings.enabled);
  const [discountValue, setDiscountValue] = useState('0');
  const [discountUnit, setDiscountUnit] = useState<DiscountUnit>('flat');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [terms, setTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    if (open) {
      setClientId(db.clients[0]?.id ?? '');
      setInvoiceNumber(generateInvoiceNumber(db.invoices.length));
      setDate(todayISO());
      setDueDate(todayISO());
      setNotes('');
      setItems([newInvoiceItem()]);
      setApplyTax(taxSettings.enabled);
      setDiscountValue('0');
      setDiscountUnit('flat');
      setPaymentAccountId(paymentAccounts.find((a) => a.isDefault)?.id ?? paymentAccounts[0]?.id ?? '');
      setTerms([...settings.terms]);
      setNewTerm('');
    }
  }, [open, db.clients, db.invoices.length, taxSettings.enabled, paymentAccounts, settings.terms]);

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: field === 'quantity' || field === 'rate' ? Number(value) : value } : item));

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setTerms((prev) => [...prev, newTerm.trim()]);
    setNewTerm('');
  };

  const removeTerm = (index: number) => setTerms((prev) => prev.filter((_, i) => i !== index));

  const financials = useMemo(() => {
    const subtotal = getSubtotal(items);
    const dVal = Number(discountValue) || 0;
    const discountAmount = discountUnit === 'flat' ? Math.min(dVal, subtotal) : subtotal * dVal / 100;
    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const taxAmount = applyTax ? taxableAmount * (taxSettings.rate / 100) : 0;
    const grandTotal = taxableAmount + taxAmount;
    return { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal };
  }, [items, discountValue, discountUnit, applyTax, taxSettings.rate]);

  const submit = () => {
    if (!clientId) {
      showToast('Please select a client first', 'error');
      return;
    }
    if (items.some((item) => !item.description || item.rate <= 0)) {
      showToast('Complete every line item with description and rate', 'error');
      return;
    }
    const invoice: Invoice = {
      id: generateId('inv'),
      invoiceNumber,
      clientId,
      date,
      dueDate,
      items,
      notes,
      status: 'Unpaid',
      paidAmount: 0,
      balanceDue: financials.grandTotal,
      createdAt: date,
      taxEnabled: applyTax,
      taxType: 'none',
      taxRate: applyTax ? taxSettings.rate : 0,
      taxLabel: taxSettings.name,
    };
    addInvoice(invoice);
    onClose();
    showToast('Invoice created successfully');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8 scrollbar-thin">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Invoice</h2>
              <p className="text-xs text-slate-400">{invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Invoice</span>
              <span className="sm:hidden">Save</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Client & Dates */}
          <div className={sectionCard}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Client <span className="text-brand-600">*</span></label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                  {db.clients.length === 0 && <option value="" disabled>No clients yet — add a client first</option>}
                  {db.clients.length > 0 && <option value="" disabled>Select a client...</option>}
                  {db.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Issue Date</label>
                <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Tax Toggle */}
          <div className={sectionCard}>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Apply {taxSettings.name || 'Tax'} ({taxSettings.rate || 18}%)
                </p>
                <p className="text-xs text-slate-500">Enable or disable tax calculation for this document</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={applyTax}
                onClick={() => setApplyTax((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${applyTax ? 'bg-[#9f0f0f]' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${applyTax ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Line Items */}
          <div className={sectionCard}>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Line Items</label>
              <button type="button" onClick={() => setItems((prev) => [...prev, newInvoiceItem()])} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-2 py-2 text-center font-semibold">Qty</th>
                    <th className="px-2 py-2 text-center font-semibold">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, index) => {
                    const amount = item.quantity * item.rate;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2"><input required placeholder="Service description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={`${smallInput} border-0 bg-transparent px-1`} /></td>
                        <td className="px-2 py-2"><input required type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className={`${smallInput} w-16 border-0 bg-transparent px-1 text-center`} /></td>
                        <td className="px-2 py-2"><input required type="number" min="0" placeholder="0" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${smallInput} w-20 border-0 bg-transparent px-1 text-center`} /></td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrencyDetailed(amount)}</td>
                        <td className="px-2 py-2"><button type="button" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="flex items-center justify-center text-slate-400 hover:text-rose-600 disabled:opacity-30" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount & Notes */}
          <div className={sectionCard}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Discount</label>
                <div className="flex gap-2">
                  <input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className={inputClass} />
                  <select value={discountUnit} onChange={(e) => setDiscountUnit(e.target.value as DiscountUnit)} className="w-28 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="flat">₹ Flat</option>
                    <option value="percent">% Percent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms..." className={inputClass} />
              </div>
            </div>
          </div>

          {/* Payment Account */}
          <div className={sectionCard}>
            <label className={labelClass}>Payment Account (for PDF)</label>
            <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className={inputClass}>
              {paymentAccounts.length === 0 && <option value="" disabled>No accounts configured</option>}
              {paymentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} — {acc.accountName}{acc.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">This bank/UPI info will appear in the PDF footer.</p>
          </div>

          {/* Terms & Conditions */}
          <div className={sectionCard}>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Terms &amp; Conditions</label>
              <button type="button" onClick={addTerm} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                <Plus className="h-4 w-4" /> Add Term
              </button>
            </div>
            <div className="space-y-2">
              {terms.map((term, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20">{index + 1}</span>
                  <p className="flex-1 text-xs text-slate-700 dark:text-slate-300">{term}</p>
                  <button type="button" onClick={() => removeTerm(index)} className="text-slate-400 transition-colors hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {terms.length === 0 && <p className="py-2 text-center text-xs text-slate-400">No terms — add one above</p>}
            </div>
            <div className="mt-3">
              <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTerm())} placeholder="Add a term and press Enter..." className={smallInput} />
            </div>
          </div>

          {/* Financial Summary */}
          <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(financials.subtotal)}</span></div>
            {financials.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-rose-600"><span>Discount {discountUnit === 'flat' ? '(₹)' : `(${discountValue}%)`}</span><span>−{formatCurrency(financials.discountAmount)}</span></div>
            )}
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Taxable</span><span>{formatCurrency(financials.taxableAmount)}</span></div>
            {applyTax && (
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>{taxSettings.name} ({taxSettings.rate}%)</span>
                <span>{formatCurrency(financials.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-brand-600 dark:border-slate-600 dark:text-brand-400"><span>Grand Total</span><span>{formatCurrency(financials.grandTotal)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
