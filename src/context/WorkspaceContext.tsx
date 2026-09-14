import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppDatabase, Invoice, InvoiceStatus, Payment, PaymentMethod, AccountingEntry, Project, Client, Quotation, Subscription, SubscriptionStatus } from '@/types';
import {
  generateId,
  generateInvoiceNumber,
  generatePaymentNumber,
  getInvoiceBalance,
  getInvoiceStatus,
  getInvoiceTotal,
  newAccountingEntry,
  newPayment,
  newProject,
  newSubscription,
  calculateNextBillingDate,
  todayISO,
} from '@/utils/calculations';
import { supabase } from '@/lib/supabase';

interface LogPaymentInput {
  amount: number;
  method: PaymentMethod;
  date: string;
  reference: string;
}

interface LogPaymentResult {
  payment: Payment;
  projectCreated: boolean;
}

interface WorkspaceContextValue {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  resetDb: () => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => LogPaymentResult | null;
  logPayment: (invoiceId: string, input: LogPaymentInput) => LogPaymentResult | null;
  addAccountingEntry: (entry: AccountingEntry) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Omit<Project, 'id'>>) => void;
  updateProjectStatus: (projectId: string, status: Project['status']) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (clientId: string) => void;
  addQuotation: (quotation: Quotation) => void;
  convertQuotationToInvoice: (quotationId: string) => void;
  addSubscription: (subscription: Subscription) => void;
  updateSubscriptionStatus: (subscriptionId: string, status: SubscriptionStatus) => void;
  deleteSubscription: (subscriptionId: string) => void;
  renewSubscription: (subscriptionId: string) => void;
  generateInvoiceFromSubscription: (subscriptionId: string) => string | null;
  syncSubscriptionsFromQuotations: () => void;
  deleteInvoice: (invoiceId: string) => void;
  deleteQuotation: (quotationId: string) => void;
  deletePayment: (paymentId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const emptyDb: AppDatabase = {
  clients: [],
  quotations: [],
  invoices: [],
  payments: [],
  accounting: [],
  projects: [],
  subscriptions: [],
};

// ── Supabase row ↔ domain type mappers ──────────────────────────────────

function rowToClient(r: Record<string, unknown>): Client {
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, gstin: r.gstin, taxNumber: r.tax_number ?? undefined, createdAt: r.created_at };
}
function clientToRow(c: Client) {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address, gstin: c.gstin, tax_number: c.taxNumber ?? null, created_at: c.createdAt };
}

function rowToQuotation(r: Record<string, unknown>): Quotation {
  return {
    id: r.id, quoteNumber: r.quote_number, clientId: r.client_id, date: r.date, validUntil: r.valid_until,
    items: r.items ?? [], notes: r.notes, status: r.status, createdAt: r.created_at,
    quotationType: r.quotation_type, subscriptionCategory: r.subscription_category,
    subscriptionStartDate: r.subscription_start_date, subscriptionEndDate: r.subscription_end_date,
    taxEnabled: r.tax_enabled, taxType: r.tax_type, taxRate: r.tax_rate, taxLabel: r.tax_label,
    discountValue: r.discount_value, discountUnit: r.discount_unit,
    showBankDetails: r.show_bank_details, showUpiDetails: r.show_upi_details,
  };
}
function quotationToRow(q: Quotation) {
  return {
    id: q.id, quote_number: q.quoteNumber, client_id: q.clientId, date: q.date, valid_until: q.validUntil,
    items: q.items, notes: q.notes, status: q.status, created_at: q.createdAt,
    quotation_type: q.quotationType, subscription_category: q.subscriptionCategory,
    subscription_start_date: q.subscriptionStartDate, subscription_end_date: q.subscriptionEndDate,
    tax_enabled: q.taxEnabled, tax_type: q.taxType, tax_rate: q.taxRate, tax_label: q.taxLabel,
    discount_value: q.discountValue, discount_unit: q.discountUnit,
    show_bank_details: q.showBankDetails, show_upi_details: q.showUpiDetails,
  };
}

function rowToInvoice(r: Record<string, unknown>): Invoice {
  return {
    id: r.id, invoiceNumber: r.invoice_number, clientId: r.client_id, date: r.date, dueDate: r.due_date,
    items: r.items ?? [], notes: r.notes, status: r.status, paidAmount: Number(r.paid_amount ?? 0),
    balanceDue: Number(r.balance_due ?? 0), createdAt: r.created_at,
    invoiceType: r.invoice_type, subscriptionCategory: r.subscription_category,
    subscriptionStartDate: r.subscription_start_date, subscriptionEndDate: r.subscription_end_date,
    subscriptionId: r.subscription_id, referenceId: r.reference_id,
    taxEnabled: r.tax_enabled, taxType: r.tax_type, taxRate: r.tax_rate, taxLabel: r.tax_label,
    discountValue: r.discount_value, discountUnit: r.discount_unit,
  };
}
function invoiceToRow(inv: Invoice) {
  return {
    id: inv.id, invoice_number: inv.invoiceNumber, client_id: inv.clientId, date: inv.date, due_date: inv.dueDate,
    items: inv.items, notes: inv.notes, status: inv.status, paid_amount: inv.paidAmount, balance_due: inv.balanceDue,
    created_at: inv.createdAt, invoice_type: inv.invoiceType, subscription_category: inv.subscriptionCategory,
    subscription_start_date: inv.subscriptionStartDate, subscription_end_date: inv.subscriptionEndDate,
    subscription_id: inv.subscriptionId, reference_id: inv.referenceId,
    tax_enabled: inv.taxEnabled, tax_type: inv.taxType, tax_rate: inv.taxRate, tax_label: inv.taxLabel,
    discount_value: inv.discountValue, discount_unit: inv.discountUnit,
  };
}

function rowToPayment(r: Record<string, unknown>): Payment {
  return { id: r.id, paymentNumber: r.payment_number, invoiceId: r.invoice_id, clientId: r.client_id, amount: Number(r.amount ?? 0), method: r.method, date: r.date, reference: r.reference, notes: r.notes };
}
function paymentToRow(p: Payment) {
  return { id: p.id, payment_number: p.paymentNumber, invoice_id: p.invoiceId, client_id: p.clientId, amount: p.amount, method: p.method, date: p.date, reference: p.reference, notes: p.notes };
}

function rowToAccounting(r: Record<string, unknown>): AccountingEntry {
  return { id: r.id, type: r.type, category: r.category, description: r.description, amount: Number(r.amount ?? 0), date: r.date, reference: r.reference };
}
function accountingToRow(e: AccountingEntry) {
  return { id: e.id, type: e.type, category: e.category, description: e.description, amount: e.amount, date: e.date, reference: e.reference };
}

function rowToProject(r: Record<string, unknown>): Project {
  return { id: r.id, name: r.name, clientId: r.client_id, description: r.description, status: r.status, startDate: r.start_date, dueDate: r.due_date, budget: Number(r.budget ?? 0), invoiceId: r.invoice_id, assignedMemberIds: r.assigned_member_ids ?? [] };
}
function projectToRow(p: Project) {
  return { id: p.id, name: p.name, client_id: p.clientId, description: p.description, status: p.status, start_date: p.startDate, due_date: p.dueDate, budget: p.budget, invoice_id: p.invoiceId, assigned_member_ids: p.assignedMemberIds ?? [] };
}

function rowToSubscription(r: Record<string, unknown>): Subscription {
  return { id: r.id, name: r.name, category: r.category, amount: Number(r.amount ?? 0), billingCycle: r.billing_cycle, nextBillingDate: r.next_billing_date, status: r.status, clientId: r.client_id, referenceId: r.reference_id, startDate: r.start_date, endDate: r.end_date, paymentMethod: r.payment_method, invoiceId: r.invoice_id, origin: r.origin };
}
function subscriptionToRow(s: Subscription): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: s.id,
    name: s.name,
    category: s.category,
    amount: s.amount,
    billing_cycle: s.billingCycle,
    next_billing_date: s.nextBillingDate,
    status: s.status,
    client_id: s.clientId ?? null,
  };
  if (s.referenceId !== undefined) row.reference_id = s.referenceId;
  if (s.startDate !== undefined) row.start_date = s.startDate;
  if (s.endDate !== undefined) row.end_date = s.endDate;
  if (s.paymentMethod !== undefined) row.payment_method = s.paymentMethod;
  if (s.invoiceId !== undefined) row.invoice_id = s.invoiceId;
  if (s.origin !== undefined) row.origin = s.origin;
  return row;
}

// ── Silent persistence helpers (fire-and-forget with error logging) ─────

function upsertRow(table: string, row: Record<string, unknown>) {
  supabase.from(table).upsert(row).then(({ error }) => { if (error) console.error(`upsert ${table}:`, error.message); });
}
function deleteRow(table: string, id: string) {
  supabase.from(table).delete().eq('id', id).then(({ error }) => { if (error) console.error(`delete ${table}:`, error.message); });
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AppDatabase>(emptyDb);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [clientsRes, quotesRes, invoicesRes, paymentsRes, accountingRes, projectsRes, subsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('quotations').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('accounting_entries').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('subscriptions').select('*'),
      ]);

      setDb({
        clients: (clientsRes.data ?? []).map(rowToClient),
        quotations: (quotesRes.data ?? []).map(rowToQuotation),
        invoices: (invoicesRes.data ?? []).map(rowToInvoice),
        payments: (paymentsRes.data ?? []).map(rowToPayment),
        accounting: (accountingRes.data ?? []).map(rowToAccounting),
        projects: (projectsRes.data ?? []).map(rowToProject),
        subscriptions: (subsRes.data ?? []).map(rowToSubscription),
      });
      setLoaded(true);
    })();
  }, []);

  const resetDb = () => {
    setDb(emptyDb);
    ['clients', 'quotations', 'invoices', 'payments', 'accounting_entries', 'projects', 'subscriptions'].forEach((t) => {
      supabase.from(t).delete().neq('id', '').then(({ error }) => { if (error) console.error(`reset ${t}:`, error.message); });
    });
  };

  const addInvoice = (invoice: Invoice) => {
    setDb((prev) => ({ ...prev, invoices: [...prev.invoices, invoice] }));
    upsertRow('invoices', invoiceToRow(invoice));
  };

  const runPaymentChain = (prev: AppDatabase, invoiceId: string, amount: number, method: PaymentMethod, date: string, reference: string): { next: AppDatabase; payment: Payment; projectCreated: boolean; updatedInvoice: Invoice; accounting: AccountingEntry; project: Project; hasProject: boolean } => {
    const invoice = prev.invoices.find((item) => item.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    const paidAmount = invoice.paidAmount + amount;
    const updatedInvoice: Invoice = {
      ...invoice,
      paidAmount,
      balanceDue: Math.max(getInvoiceTotal(invoice.items) - paidAmount, 0),
      status: getInvoiceStatus({ ...invoice, paidAmount }),
    };
    const payment: Payment = {
      ...newPayment(invoice, invoice.clientId, amount, method, date, reference),
      paymentNumber: generatePaymentNumber(prev.payments.length),
    };
    const accounting = newAccountingEntry('income', amount, 'Invoice Payment', `Payment received for ${invoice.invoiceNumber}`, reference || invoice.invoiceNumber);
    const hasProject = prev.projects.some((project) => project.invoiceId === invoice.id);
    const clientName = prev.clients.find((client) => client.id === invoice.clientId)?.name ?? invoice.invoiceNumber;
    const project: Project = {
      ...newProject(`Project - ${clientName}`, invoice.clientId, getInvoiceTotal(invoice.items)),
      invoiceId: invoice.id,
      description: `Auto-generated from Invoice ${invoice.invoiceNumber}`,
    };
    const next: AppDatabase = {
      ...prev,
      invoices: prev.invoices.map((item) => item.id === invoiceId ? updatedInvoice : item),
      payments: [...prev.payments, payment],
      accounting: [...prev.accounting, accounting],
      projects: hasProject ? prev.projects : [...prev.projects, project],
    };
    return { next, payment, projectCreated: !hasProject, updatedInvoice, accounting, project, hasProject };
  };

  const logPayment = (invoiceId: string, input: LogPaymentInput): LogPaymentResult | null => {
    let result: LogPaymentResult | null = null;
    setDb((prev) => {
      const invoice = prev.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return prev;
      const balance = getInvoiceBalance(invoice);
      const amount = Math.min(Math.max(input.amount, 0), balance);
      if (amount <= 0) return prev;
      const chain = runPaymentChain(prev, invoiceId, amount, input.method, input.date, input.reference);
      result = { payment: chain.payment, projectCreated: chain.projectCreated };

      // Persist
      upsertRow('invoices', invoiceToRow(chain.updatedInvoice));
      upsertRow('payments', paymentToRow(chain.payment));
      upsertRow('accounting_entries', accountingToRow(chain.accounting));
      if (!chain.hasProject) upsertRow('projects', projectToRow(chain.project));

      return chain.next;
    });
    return result;
  };

  const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus): LogPaymentResult | null => {
    if (status !== 'Paid') {
      setDb((prev) => ({
        ...prev,
        invoices: prev.invoices.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice),
      }));
      const inv = db.invoices.find((i) => i.id === invoiceId);
      if (inv) upsertRow('invoices', invoiceToRow({ ...inv, status }));
      return null;
    }
    let result: LogPaymentResult | null = null;
    setDb((prev) => {
      const invoice = prev.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return prev;
      if (invoice.status === 'Paid' && getInvoiceBalance(invoice) <= 0) return prev;
      const balance = getInvoiceBalance(invoice);
      if (balance <= 0) {
        const updated = { ...invoice, status: 'Paid' as InvoiceStatus };
        upsertRow('invoices', invoiceToRow(updated));
        return { ...prev, invoices: prev.invoices.map((item) => item.id === invoiceId ? updated : item) };
      }
      const chain = runPaymentChain(prev, invoiceId, balance, 'Bank Transfer', todayISO(), invoice.invoiceNumber);
      result = { payment: chain.payment, projectCreated: chain.projectCreated };

      upsertRow('invoices', invoiceToRow(chain.updatedInvoice));
      upsertRow('payments', paymentToRow(chain.payment));
      upsertRow('accounting_entries', accountingToRow(chain.accounting));
      if (!chain.hasProject) upsertRow('projects', projectToRow(chain.project));

      return chain.next;
    });
    return result;
  };

  const addAccountingEntry = (entry: AccountingEntry) => {
    setDb((prev) => ({ ...prev, accounting: [...prev.accounting, entry] }));
    upsertRow('accounting_entries', accountingToRow(entry));
  };

  const addProject = (project: Project) => {
    setDb((prev) => ({ ...prev, projects: [...prev.projects, project] }));
    upsertRow('projects', projectToRow(project));
  };

  const updateProject = (projectId: string, updates: Partial<Omit<Project, 'id'>>) => {
    setDb((prev) => {
      const next = prev.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p));
      const updated = next.find((p) => p.id === projectId);
      if (updated) upsertRow('projects', projectToRow(updated));
      return { ...prev, projects: next };
    });
  };

  const updateProjectStatus = (projectId: string, status: Project['status']) => {
    updateProject(projectId, { status });
  };

  const addClient = (client: Client) => {
    setDb((prev) => ({ ...prev, clients: [...prev.clients, client] }));
    upsertRow('clients', clientToRow(client));
  };

  const updateClient = (client: Client) => {
    setDb((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === client.id ? client : c)),
    }));
    upsertRow('clients', clientToRow(client));
  };

  const deleteClient = (clientId: string) => {
    setDb((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== clientId),
    }));
    deleteRow('clients', clientId);
    window.dispatchEvent(new Event('clients_updated'));
  };

  const addQuotation = (quotation: Quotation) => {
    setDb((prev) => ({ ...prev, quotations: [...prev.quotations, quotation] }));
    upsertRow('quotations', quotationToRow(quotation));
  };

  const convertQuotationToInvoice = (quotationId: string) => {
    setDb((prev) => {
      const quotation = prev.quotations.find((q) => q.id === quotationId);
      if (!quotation) return prev;
      const invoice: Invoice = {
        id: generateId('inv'),
        invoiceNumber: generateInvoiceNumber(prev.invoices.length),
        clientId: quotation.clientId,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        items: quotation.items.map((item) => ({
          id: generateId('ii'),
          description: item.description,
          hsnSac: '998314',
          quantity: item.quantity,
          rate: item.rate,
        })),
        notes: quotation.notes,
        status: 'Unpaid',
        paidAmount: 0,
        balanceDue: getInvoiceTotal(quotation.items),
        createdAt: new Date().toISOString().split('T')[0],
        invoiceType: quotation.quotationType === 'subscription' ? 'recurring' : 'regular',
        subscriptionCategory: quotation.subscriptionCategory,
        subscriptionStartDate: quotation.subscriptionStartDate,
        subscriptionEndDate: quotation.subscriptionEndDate,
        referenceId: quotationId,
      };
      const linkedSub = prev.subscriptions.find((s) => s.referenceId === quotationId);
      const updatedQuote = { ...quotation, status: 'Accepted' as const };

      upsertRow('invoices', invoiceToRow(invoice));
      upsertRow('quotations', quotationToRow(updatedQuote));
      if (linkedSub) {
        const updatedSub = { ...linkedSub, invoiceId: invoice.id, origin: 'quotation' as const };
        upsertRow('subscriptions', subscriptionToRow(updatedSub));
      }

      return {
        ...prev,
        invoices: [...prev.invoices, invoice],
        quotations: prev.quotations.map((q) => q.id === quotationId ? updatedQuote : q),
        subscriptions: linkedSub
          ? prev.subscriptions.map((s) => s.referenceId === quotationId ? { ...s, invoiceId: invoice.id, origin: 'quotation' } : s)
          : prev.subscriptions,
      };
    });
  };

  const addSubscription = (subscription: Subscription) => {
    setDb((prev) => ({ ...prev, subscriptions: [...prev.subscriptions, subscription] }));
    upsertRow('subscriptions', subscriptionToRow(subscription));
    window.dispatchEvent(new Event('subscriptions_updated'));
  };

  const updateSubscriptionStatus = (subscriptionId: string, status: SubscriptionStatus) => {
    setDb((prev) => {
      const next = prev.subscriptions.map((sub) => sub.id === subscriptionId ? { ...sub, status } : sub);
      const updated = next.find((s) => s.id === subscriptionId);
      if (updated) upsertRow('subscriptions', subscriptionToRow(updated));
      return { ...prev, subscriptions: next };
    });
  };

  const deleteSubscription = (subscriptionId: string) => {
    setDb((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.filter((sub) => sub.id !== subscriptionId),
    }));
    deleteRow('subscriptions', subscriptionId);
  };

  const renewSubscription = (subscriptionId: string) => {
    setDb((prev) => {
      const next = prev.subscriptions.map((sub) =>
        sub.id === subscriptionId
          ? { ...sub, nextBillingDate: calculateNextBillingDate(todayISO(), sub.billingCycle), status: 'active' as SubscriptionStatus }
          : sub
      );
      const updated = next.find((s) => s.id === subscriptionId);
      if (updated) upsertRow('subscriptions', subscriptionToRow(updated));
      return { ...prev, subscriptions: next };
    });
  };

  const generateInvoiceFromSubscription = (subscriptionId: string): string | null => {
    let invoiceNumber: string | null = null;
    setDb((prev) => {
      const sub = prev.subscriptions.find((s) => s.id === subscriptionId);
      if (!sub) return prev;
      if (sub.invoiceId && prev.invoices.some((inv) => inv.id === sub.invoiceId)) return prev;
      const invNum = generateInvoiceNumber(prev.invoices.length);
      invoiceNumber = invNum;
      const invoice: Invoice = {
        id: generateId('inv'),
        invoiceNumber: invNum,
        clientId: sub.clientId ?? '',
        date: todayISO(),
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        items: [{ id: generateId('ii'), description: sub.name, hsnSac: '998314', quantity: 1, rate: sub.amount }],
        notes: `Recurring subscription - ${sub.billingCycle} billing`,
        status: 'Unpaid',
        paidAmount: 0,
        balanceDue: sub.amount * 1.18,
        createdAt: todayISO(),
        invoiceType: 'recurring',
        subscriptionCategory: sub.category,
        subscriptionStartDate: sub.startDate,
        subscriptionEndDate: sub.endDate,
        subscriptionId: subscriptionId,
      };
      const updatedSub = { ...sub, invoiceId: invoice.id, nextBillingDate: calculateNextBillingDate(todayISO(), sub.billingCycle) };

      upsertRow('invoices', invoiceToRow(invoice));
      upsertRow('subscriptions', subscriptionToRow(updatedSub));

      return {
        ...prev,
        invoices: [...prev.invoices, invoice],
        subscriptions: prev.subscriptions.map((s) => s.id === subscriptionId ? updatedSub : s),
      };
    });
    return invoiceNumber;
  };

  const deleteInvoice = (invoiceId: string) => {
    setDb((prev) => {
      const invoice = prev.invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) return prev;
      const linkedPaymentRefs = new Set(
        prev.payments
          .filter((p) => p.invoiceId === invoiceId)
          .map((p) => p.reference || invoice.invoiceNumber)
      );
      const linkedPaymentIds = prev.payments.filter((p) => p.invoiceId === invoiceId).map((p) => p.id);
      const linkedProjectIds = prev.projects.filter((p) => p.invoiceId === invoiceId).map((p) => p.id);

      // Persist deletions
      deleteRow('invoices', invoiceId);
      linkedPaymentIds.forEach((id) => deleteRow('payments', id));
      linkedProjectIds.forEach((id) => deleteRow('projects', id));

      // Update subscriptions that referenced this invoice
      prev.subscriptions.filter((s) => s.invoiceId === invoiceId).forEach((s) => {
        upsertRow('subscriptions', subscriptionToRow({ ...s, invoiceId: undefined }));
      });

      return {
        ...prev,
        invoices: prev.invoices.filter((inv) => inv.id !== invoiceId),
        payments: prev.payments.filter((p) => p.invoiceId !== invoiceId),
        accounting: prev.accounting.filter((entry) => {
          if (entry.type === 'income' && entry.category === 'Invoice Payment') {
            if (entry.reference === invoice.invoiceNumber && linkedPaymentRefs.has(entry.reference)) return false;
          }
          return true;
        }),
        projects: prev.projects.filter((project) => project.invoiceId !== invoiceId),
        subscriptions: prev.subscriptions.map((sub) =>
          sub.invoiceId === invoiceId ? { ...sub, invoiceId: undefined } : sub
        ),
      };
    });
  };

  const deleteQuotation = (quotationId: string) => {
    setDb((prev) => {
      const linkedSubIds = prev.subscriptions.filter((s) => s.referenceId === quotationId).map((s) => s.id);
      linkedSubIds.forEach((id) => deleteRow('subscriptions', id));
      deleteRow('quotations', quotationId);

      return {
        ...prev,
        quotations: prev.quotations.filter((q) => q.id !== quotationId),
        subscriptions: prev.subscriptions.filter((sub) => sub.referenceId !== quotationId),
      };
    });
  };

  const deletePayment = (paymentId: string) => {
    setDb((prev) => {
      const payment = prev.payments.find((p) => p.id === paymentId);
      if (!payment) return prev;
      const invoice = prev.invoices.find((inv) => inv.id === payment.invoiceId);
      const accountingRef = payment.reference || invoice?.invoiceNumber || '';
      let updatedInvoices = prev.invoices;
      let updatedInvoice: Invoice | null = null;
      if (invoice) {
        const newPaidAmount = Math.max(invoice.paidAmount - payment.amount, 0);
        const total = getInvoiceTotal(invoice.items);
        const newBalance = Math.max(total - newPaidAmount, 0);
        const dueDate = new Date(invoice.dueDate);
        const finalStatus: InvoiceStatus =
          newPaidAmount <= 0
            ? dueDate < new Date() ? 'Overdue' : 'Unpaid'
            : newPaidAmount < total ? 'Partial' : 'Paid';
        updatedInvoice = { ...invoice, paidAmount: newPaidAmount, balanceDue: newBalance, status: finalStatus };
        updatedInvoices = prev.invoices.map((inv) => inv.id === invoice.id ? updatedInvoice! : inv);
        upsertRow('invoices', invoiceToRow(updatedInvoice));
      }
      const paymentsForRef = prev.payments.filter(
        (p) => p.invoiceId === payment.invoiceId && (p.reference || invoice?.invoiceNumber) === accountingRef
      );
      const isLastPaymentWithRef = paymentsForRef.length <= 1;

      deleteRow('payments', paymentId);

      return {
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
        invoices: updatedInvoices,
        accounting: prev.accounting.filter((entry) => {
          if (isLastPaymentWithRef && entry.type === 'income' && entry.category === 'Invoice Payment' && entry.reference === accountingRef) {
            return false;
          }
          return true;
        }),
      };
    });
  };

  const syncSubscriptionsFromQuotations = () => {
    setDb((prev) => {
      const recurringQuotes = prev.quotations.filter((q) => q.quotationType === 'subscription');
      const existingIds = new Set(prev.subscriptions.map((s) => s.referenceId));
      const newSubs: Subscription[] = [];
      for (const quote of recurringQuotes) {
        if (existingIds.has(quote.id)) continue;
        const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const grandTotal = subtotal * 1.18;
        const sub: Subscription = {
          id: generateId('sub'),
          name: quote.items[0]?.description || 'Recurring Subscription',
          clientId: quote.clientId,
          category: quote.subscriptionCategory || 'Web Hosting & Maintenance',
          amount: grandTotal,
          billingCycle: 'monthly',
          nextBillingDate: calculateNextBillingDate(quote.subscriptionStartDate || quote.date, 'monthly'),
          status: 'active',
          startDate: quote.subscriptionStartDate || quote.date,
          endDate: quote.subscriptionEndDate || quote.validUntil,
          referenceId: quote.id,
          paymentMethod: 'Auto / Invoiced',
          origin: 'quotation',
        };
        newSubs.push(sub);
        upsertRow('subscriptions', subscriptionToRow(sub));
      }
      if (newSubs.length === 0) return prev;
      return { ...prev, subscriptions: [...prev.subscriptions, ...newSubs] };
    });
  };

  if (!loaded) return null;

  return (
    <WorkspaceContext.Provider value={{ db, setDb, resetDb, addInvoice, updateInvoiceStatus, logPayment, addAccountingEntry, addProject, updateProject, updateProjectStatus, addClient, updateClient, deleteClient, addQuotation, convertQuotationToInvoice, addSubscription, updateSubscriptionStatus, deleteSubscription, renewSubscription, generateInvoiceFromSubscription, syncSubscriptionsFromQuotations, deleteInvoice, deleteQuotation, deletePayment }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
