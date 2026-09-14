import type { Invoice, InvoiceItem, AccountingEntry, Project, Payment, QuoteItem, Client, Subscription, BillingCycle } from '@/types';

export const GST_RATE = 0.18;

export const parseTransactionDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  return new Date(dateStr);
};

export const formatCurrency = (amount: number): string =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

export const formatCurrencyDetailed = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const getSubtotal = (items: { quantity: number; rate: number }[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

export const getGstAmount = (items: { quantity: number; rate: number }[]): number =>
  getSubtotal(items) * GST_RATE;

export const getCgst = (items: { quantity: number; rate: number }[]): number =>
  getGstAmount(items) / 2;

export const getSgst = (items: { quantity: number; rate: number }[]): number =>
  getGstAmount(items) / 2;

export const getInvoiceTotal = (items: { quantity: number; rate: number }[]): number =>
  getSubtotal(items) * (1 + GST_RATE);

export const getInvoicePaidAmount = (invoice: Invoice): number => invoice.paidAmount;

export const getInvoiceBalance = (invoice: Invoice): number =>
  getInvoiceTotal(invoice.items) - invoice.paidAmount;

export const getInvoiceStatus = (invoice: Invoice): Invoice['status'] => {
  const total = getInvoiceTotal(invoice.items);
  if (invoice.paidAmount >= total && total > 0) return 'Paid';
  if (invoice.paidAmount > 0) return 'Partial';
  const due = new Date(invoice.dueDate);
  if (due < new Date()) return 'Overdue';
  return 'Unpaid';
};

export const todayISO = (): string => new Date().toISOString().split('T')[0];

export const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const generateInvoiceNumber = (count: number): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const num = (7406 + count).toString();
  return `INV/${year}${month}/${num}`;
};

export const generatePaymentNumber = (count: number): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const num = (100 + count).toString();
  return `PMT/${year}${month}/${num}`;
};

export const newInvoiceItem = (): InvoiceItem => ({
  id: generateId('ii'),
  description: '',
  hsnSac: '998314',
  quantity: 1,
  rate: 0,
});

export const newPayment = (invoice: Invoice, clientId: string, amount: number, method: Payment['method'], date: string, reference: string): Payment => ({
  id: generateId('pay'),
  paymentNumber: '',
  invoiceId: invoice.id,
  clientId,
  amount,
  method,
  date,
  reference,
  notes: `Payment for ${invoice.invoiceNumber}`,
});

export const newAccountingEntry = (type: 'income' | 'expense', amount: number, category: string, description: string, reference: string): AccountingEntry => ({
  id: generateId('acc'),
  type,
  amount,
  category,
  description,
  date: todayISO(),
  reference,
});

export const newProject = (name: string, clientId: string, budget: number): Project => ({
  id: generateId('prj'),
  name,
  clientId,
  description: 'Auto-created from invoice payment',
  status: 'In Progress',
  startDate: todayISO(),
  dueDate: '',
  budget,
});

export const generateQuotationNumber = (count: number): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const num = (1 + count).toString().padStart(4, '0');
  return `QUO/${year}${month}/${num}`;
};

export const newQuoteItem = (): QuoteItem => ({
  id: generateId('qi'),
  description: '',
  quantity: 1,
  rate: 0,
});

export const newClient = (name: string, email: string, phone: string, address: string, gstin: string): Client => ({
  id: generateId('cli'),
  name,
  email,
  phone,
  address,
  gstin,
  createdAt: todayISO(),
});

export const calculateNextBillingDate = (startDate: string, cycle: BillingCycle): string => {
  const d = new Date(startDate);
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

export const newSubscription = (
  name: string,
  clientId: string,
  amount: number,
  billingCycle: BillingCycle,
  startDate: string,
  referenceId?: string,
  category?: string,
): Subscription => ({
  id: generateId('sub'),
  name,
  clientId,
  category: category ?? 'Recurring Service',
  amount,
  billingCycle,
  status: 'active',
  startDate,
  nextBillingDate: calculateNextBillingDate(startDate, billingCycle),
  referenceId,
  paymentMethod: 'Auto / Invoiced',
});

export interface DocumentFinancials {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  grandTotal: number;
}

export function computeDocumentFinancials(
  items: { quantity: number; rate: number }[],
  opts: {
    taxEnabled: boolean;
    taxType: 'cgst_sgst' | 'igst' | 'custom' | 'none';
    taxRate: number;
    discountValue: number;
    discountUnit: 'flat' | 'percent';
  },
): DocumentFinancials {
  const subtotal = getSubtotal(items);
  const dVal = opts.discountValue || 0;
  const discountAmount = opts.discountUnit === 'flat'
    ? Math.min(dVal, subtotal)
    : subtotal * dVal / 100;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let taxAmount = 0;

  if (opts.taxEnabled && opts.taxType !== 'none') {
    if (opts.taxType === 'cgst_sgst') {
      const half = opts.taxRate / 2;
      cgst = taxableAmount * (half / 100);
      sgst = taxableAmount * (half / 100);
      taxAmount = cgst + sgst;
    } else if (opts.taxType === 'igst') {
      igst = taxableAmount * (opts.taxRate / 100);
      taxAmount = igst;
    } else if (opts.taxType === 'custom') {
      igst = taxableAmount * (opts.taxRate / 100);
      taxAmount = igst;
    }
  }

  const grandTotal = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxableAmount, cgst, sgst, igst, taxAmount, grandTotal };
}
