import { FileText, Plus, Save, Trash2, CircleUser as UserCircle, X, Eye, EyeOff, Repeat, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { QuoteItem, Quotation } from '@/types';
import { inputClass, labelClass } from '@/components/Modal';
import { formatCurrency, formatCurrencyDetailed, generateId, generateQuotationNumber, newQuoteItem, todayISO, getSubtotal } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';
import { useSubscriptionCategories } from '@/hooks/useSubscriptionCategories';

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
}

type QuotationType = 'service' | 'subscription';
type DiscountUnit = 'flat' | 'percent';

const sectionCard = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50';
const smallInput = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export function QuotationModal({ open, onClose }: QuotationModalProps) {
  const { db, addQuotation } = useWorkspace();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { categories: subCategories } = useSubscriptionCategories();
  const companyProfile = settings.profile;
  const paymentAccounts = settings.paymentAccounts;
  const taxSettings = settings.tax;
  const taxName = companyProfile.taxLabel || taxSettings.name || 'Tax';
  const isGst = taxName.toUpperCase() === 'GST';

  const [clientId, setClientId] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [editingQuoteNumber, setEditingQuoteNumber] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([newQuoteItem()]);
  const [quotType, setQuotType] = useState<QuotationType>('service');
  const [subCategory, setSubCategory] = useState('');
  const [subStartDate, setSubStartDate] = useState(todayISO());
  const [subEndDate, setSubEndDate] = useState('');
  const [applyTax, setApplyTax] = useState(taxSettings.enabled);
  const [discountValue, setDiscountValue] = useState('0');
  const [discountUnit, setDiscountUnit] = useState<DiscountUnit>('flat');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showUpiDetails, setShowUpiDetails] = useState(true);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (open) {
      setClientId(db.clients[0]?.id ?? '');
      setQuoteNumber(generateQuotationNumber(db.quotations.length));
      setEditingQuoteNumber(false);
      setDate(todayISO());
      setValidUntil(todayISO());
      setNotes('');
      setItems([newQuoteItem()]);
      setQuotType('service');
      setSubCategory(subCategories[0] ?? '');
      setSubStartDate(todayISO());
      setSubEndDate('');
      setApplyTax(taxSettings.enabled);
      setDiscountValue('0');
      setDiscountUnit('flat');
      setPaymentAccountId(paymentAccounts.find((a) => a.isDefault)?.id ?? paymentAccounts[0]?.id ?? '');
      setShowBankDetails(true);
      setShowUpiDetails(true);
      setTerms([...settings.terms]);
      setNewTerm('');
      setShowPreview(true);
    }
  }, [open, db.clients, db.quotations.length, taxSettings.enabled, paymentAccounts, settings.terms, subCategories]);

  const updateItem = (id: string, field: keyof QuoteItem, value: string) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: field === 'quantity' || field === 'rate' ? Number(value) : value } : item));

  const addTerm = () => {
    if (!newTerm.trim()) return;
    setTerms((prev) => [...prev, newTerm.trim()]);
    setNewTerm('');
  };

  const removeTerm = (index: number) => setTerms((prev) => prev.filter((_, i) => i !== index));

  const selectedClient = db.clients.find((c) => c.id === clientId);
  const selectedAccount = paymentAccounts.find((a) => a.id === paymentAccountId);

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
    if (quotType === 'subscription' && (!subCategory || !subStartDate || !subEndDate)) {
      showToast('Subscription category and start/end dates are required', 'error');
      return;
    }
    const quotation: Quotation = {
      id: generateId('quo'),
      quoteNumber,
      clientId,
      date,
      validUntil,
      items,
      notes,
      status: 'Sent',
      createdAt: date,
      quotationType: quotType,
      subscriptionCategory: quotType === 'subscription' ? subCategory : undefined,
      subscriptionStartDate: quotType === 'subscription' ? subStartDate : undefined,
      subscriptionEndDate: quotType === 'subscription' ? subEndDate : undefined,
      taxEnabled: applyTax,
      taxType: applyTax ? 'custom' : 'none',
      taxRate: applyTax ? taxSettings.rate : 0,
      taxLabel: companyProfile.taxLabel || taxSettings.name,
      discountValue: Number(discountValue) || 0,
      discountUnit,
      showBankDetails,
      showUpiDetails,
    };
    addQuotation(quotation);
    if (quotType === 'subscription') {
      window.dispatchEvent(new Event('subscriptions_updated'));
    }
    onClose();
    showToast('Quotation saved successfully');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Quotation Builder</h2>
              {editingQuoteNumber ? (
                <div className="flex items-center gap-1">
                  <input
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    onBlur={() => setEditingQuoteNumber(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingQuoteNumber(false)}
                    autoFocus
                    className="rounded border border-brand-400 px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:border-brand-500 dark:border-brand-600 dark:bg-slate-800 dark:text-white"
                  />
                  <button type="button" onClick={() => setEditingQuoteNumber(false)} className="text-brand-600"><Pencil className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="hidden text-xs text-slate-400 sm:block">{quoteNumber}</p>
                  <button type="button" onClick={() => setEditingQuoteNumber(true)} className="text-slate-400 transition-colors hover:text-brand-600" title="Edit quotation number">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-sm"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700 sm:text-sm"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Quotation</span>
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

        {/* Body — two columns */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* LEFT — Editor */}
          <div className={`overflow-y-auto p-4 sm:p-6 ${showPreview ? 'lg:w-1/2' : 'w-full'} scrollbar-thin`}>
            <div className="space-y-5">
              {/* Quotation Type Switcher */}
              <div className={sectionCard}>
                <label className={labelClass}>Quotation Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuotType('service')}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${quotType === 'service' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    Service (One-time)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuotType('subscription')}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${quotType === 'subscription' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    Subscription (Recurring)
                  </button>
                </div>
              </div>

              {/* Client & Date Row */}
              <div className={sectionCard}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Client <span className="text-brand-600">*</span></label>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                      {db.clients.length === 0 && <option value="" disabled>No clients found — add a client first</option>}
                      {db.clients.length > 0 && <option value="" disabled>Select a client...</option>}
                      {db.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    {selectedClient && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <UserCircle className="h-3.5 w-3.5" />
                        {selectedClient.email} · {selectedClient.taxNumber || selectedClient.gstin || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Issue Date</label>
                    <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              <div className={sectionCard}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Expiry Date</label>
                    <input required type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
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

              {/* Subscription Details — only when type is subscription */}
              {quotType === 'subscription' && (
                <div className={sectionCard}>
                  <div className="mb-3 flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-brand-600" />
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subscription Details</label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Subscription Category <span className="text-brand-600">*</span></label>
                      <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className={inputClass}>
                        {subCategories.length === 0 && <option value="" disabled>No categories configured</option>}
                        {subCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Start Date <span className="text-brand-600">*</span></label>
                      <input type="date" value={subStartDate} onChange={(e) => setSubStartDate(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>End Date / Next Renewal <span className="text-brand-600">*</span></label>
                      <input type="date" value={subEndDate} onChange={(e) => setSubEndDate(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className={sectionCard}>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Line Items</label>
                  <button type="button" onClick={() => setItems((prev) => [...prev, newQuoteItem()])} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    <Plus className="h-4 w-4" /> Add Item
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[420px] text-left text-sm">
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
                            <td className="px-3 py-2"><input required placeholder="Item description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={`${smallInput} border-0 bg-transparent px-1`} /></td>
                            <td className="px-2 py-2"><input required type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className={`${smallInput} w-16 border-0 bg-transparent px-1 text-center`} /></td>
                            <td className="px-2 py-2"><input required type="number" min="0" placeholder="0" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${smallInput} w-20 border-0 bg-transparent px-1 text-center`} /></td>
                            <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(amount)}</td>
                            <td className="px-2 py-2"><button type="button" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="flex items-center justify-center text-slate-400 hover:text-rose-600 disabled:opacity-30" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Account Selection */}
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Include Bank Details</p>
                      <p className="text-[11px] text-slate-400">Show bank info in PDF</p>
                    </div>
                    <button type="button" role="switch" aria-checked={showBankDetails} onClick={() => setShowBankDetails((prev) => !prev)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showBankDetails ? 'bg-[#9f0f0f]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${showBankDetails ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Include UPI &amp; QR Code</p>
                      <p className="text-[11px] text-slate-400">Show UPI ID and QR in PDF</p>
                    </div>
                    <button type="button" role="switch" aria-checked={showUpiDetails} onClick={() => setShowUpiDetails((prev) => !prev)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showUpiDetails ? 'bg-[#9f0f0f]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${showUpiDetails ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Discount & Notes Row */}
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
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className={inputClass} />
                  </div>
                </div>
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
                <div className="mt-3 flex gap-2">
                  <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTerm())} placeholder="Add a term and press Enter..." className={smallInput} />
                </div>
              </div>

              {/* Financial Summary */}
              <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{formatCurrency(financials.subtotal)}</span></div>
                {financials.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-rose-600"><span>Discount {discountUnit === 'flat' ? '(₹)' : `(${discountValue}%)`}</span><span>−{formatCurrency(financials.discountAmount)}</span></div>
                )}
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Taxable Amount</span><span>{formatCurrency(financials.taxableAmount)}</span></div>
                {applyTax && (
                  isGst ? <>
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>CGST ({taxSettings.rate / 2}%)</span><span>{formatCurrency(financials.taxAmount / 2)}</span></div>
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>SGST ({taxSettings.rate / 2}%)</span><span>{formatCurrency(financials.taxAmount / 2)}</span></div>
                  </> : <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>{taxName} ({taxSettings.rate}%)</span><span>{formatCurrency(financials.taxAmount)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-brand-600 dark:border-slate-600 dark:text-brand-400"><span>Grand Total</span><span>{formatCurrency(financials.grandTotal)}</span></div>
              </div>
            </div>
          </div>

          {/* RIGHT — Live Preview */}
          {showPreview && (
            <div className="overflow-y-auto border-t border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950/50 lg:w-1/2 lg:border-l lg:border-t-0 scrollbar-thin sm:p-6">
              <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-slate-900 sm:max-w-lg">
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-lg font-bold text-white">
                      {companyProfile.logo ? <img src={companyProfile.logo} alt="Logo" className="h-full w-full object-contain" /> : 'Z'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{companyProfile.name}</h3>
                      <p className="text-xs text-slate-500">{companyProfile.address}</p>
                      <p className="text-xs text-slate-500">{companyProfile.email} · {companyProfile.phone}</p>
                      <p className="text-xs text-slate-500">{taxName}: {companyProfile.taxNumber || companyProfile.gstin || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-600">QUOTATION</p>
                    <p className="mt-1 text-xs text-slate-500">{quoteNumber}</p>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{quotType}</span>
                  </div>
                </div>

                {/* Meta Grid */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quote Date</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Valid Until</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(validUntil).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Client */}
                {selectedClient && (
                  <div className="mt-4 rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quotation For</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedClient.name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.address}</p>
                    <p className="text-xs text-slate-500">{taxName}: {selectedClient.taxNumber || selectedClient.gstin || '—'}</p>
                  </div>
                )}

                {/* Subscription details in preview */}
                {quotType === 'subscription' && subCategory && (
                  <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-blue-600" />
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-800 dark:text-blue-300">{subCategory}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      Billing Period: {subStartDate ? new Date(subStartDate).toLocaleDateString('en-IN') : '—'} to {subEndDate ? new Date(subEndDate).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                )}

                {/* Line Items Table */}
                <div className="mt-4 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Description</th>
                        <th className="px-2 py-2 text-center">Qty</th>
                        <th className="px-2 py-2 text-right">Unit Price</th>
                        <th className="px-2 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-2 py-2 text-slate-400">{index + 1}</td>
                          <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{item.description || '—'}</td>
                          <td className="px-2 py-2 text-center text-slate-500">{item.quantity}</td>
                          <td className="px-2 py-2 text-right text-slate-500">{formatCurrencyDetailed(item.rate)}</td>
                          <td className="px-2 py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrencyDetailed(item.quantity * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 flex justify-end">
                  <div className="w-56 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(financials.subtotal)}</span></div>
                    {financials.discountAmount > 0 && <div className="flex justify-between text-rose-600"><span>Discount</span><span>−{formatCurrency(financials.discountAmount)}</span></div>}
                    <div className="flex justify-between text-slate-500"><span>Taxable Amount</span><span>{formatCurrency(financials.taxableAmount)}</span></div>
                    {applyTax && (
                      isGst ? <>
                        <div className="flex justify-between text-slate-500"><span>CGST ({taxSettings.rate / 2}%)</span><span>{formatCurrency(financials.taxAmount / 2)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>SGST ({taxSettings.rate / 2}%)</span><span>{formatCurrency(financials.taxAmount / 2)}</span></div>
                      </> : <div className="flex justify-between text-slate-500"><span>{taxName} ({taxSettings.rate}%)</span><span>{formatCurrency(financials.taxAmount)}</span></div>
                    )}
                    <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-brand-600 dark:border-slate-600 dark:text-brand-400"><span>Grand Total</span><span>{formatCurrency(financials.grandTotal)}</span></div>
                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <p className="font-semibold">Notes</p>
                    <p className="mt-1">{notes}</p>
                  </div>
                )}

                {/* Footer Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  {/* Terms */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Terms &amp; Conditions</p>
                    <ol className="space-y-1 text-xs text-slate-500">
                      {terms.map((term, index) => (
                        <li key={index} className="flex gap-1.5">
                          <span className="font-semibold text-slate-400">{index + 1}.</span>
                          <span>{term}</span>
                        </li>
                      ))}
                      {terms.length === 0 && <li className="text-slate-400">No terms specified</li>}
                    </ol>
                  </div>
                  {/* Payment Details */}
                  {(showBankDetails || showUpiDetails) && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payment Details</p>
                      {selectedAccount ? (
                        <div className="space-y-1 text-xs text-slate-500">
                          {showBankDetails && (
                            <>
                              <p><span className="font-medium">Bank:</span> {selectedAccount.bankName}</p>
                              <p><span className="font-medium">A/C:</span> {selectedAccount.accountNumber}</p>
                              <p><span className="font-medium">IFSC:</span> {selectedAccount.ifsc}</p>
                              {selectedAccount.branchName && <p><span className="font-medium">Branch:</span> {selectedAccount.branchName}</p>}
                            </>
                          )}
                          {showUpiDetails && (
                            <>
                              {selectedAccount.upiId && <p><span className="font-medium">UPI:</span> {selectedAccount.upiId}</p>}
                              {selectedAccount.qrCode && (
                                <img src={selectedAccount.qrCode} alt="UPI QR Code" className="mt-1 h-20 w-20 rounded-md border border-slate-200 object-contain dark:border-slate-700" />
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No account selected</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Signatory */}
                <div className="mt-6 border-t border-slate-200 pt-4 text-center dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Authorized Signatory: {companyProfile.name}</p>
                  <p className="mt-1 text-xs text-slate-400">This is a computer-generated document.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
