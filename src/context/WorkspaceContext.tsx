import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppDatabase, Invoice, InvoiceStatus, Payment, PaymentMethod, AccountingEntry, Project, Client, Quotation, Subscription, SubscriptionStatus } from '@/types';
import { emptyDb, STORAGE_KEY } from '@/data/sampleData';
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

function normalizeDb(parsed: Partial<AppDatabase>): AppDatabase {
  const base = structuredClone(emptyDb);
  return {
    clients: parsed.clients ?? base.clients,
    quotations: parsed.quotations ?? base.quotations,
    invoices: (parsed.invoices ?? base.invoices).map((invoice) => {
      const paidAmount = invoice.paidAmount ?? (invoice.status === 'Paid' ? getInvoiceTotal(invoice.items) : 0);
      return {
        ...invoice,
        items: invoice.items.map((item) => ({ ...item, hsnSac: item.hsnSac ?? '998314' })),
        paidAmount,
        balanceDue: invoice.balanceDue ?? Math.max(getInvoiceTotal(invoice.items) - paidAmount, 0),
      };
    }),
    payments: (parsed.payments ?? base.payments).map((payment) => ({ ...payment, reference: payment.reference ?? '' })),
    accounting: (parsed.accounting ?? base.accounting).map((entry) => ({ ...entry, reference: entry.reference ?? '' })),
    projects: parsed.projects ?? base.projects,
    subscriptions: parsed.subscriptions ?? base.subscriptions,
  };
}

function loadDb(): AppDatabase {
  ['zubkas_workspace_db', 'zubkas_clients_data', 'zubkas_invoices_data', 'zubkas_payments_data'].forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  });
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeDb(JSON.parse(raw) as Partial<AppDatabase>);
  } catch {
    return structuredClone(emptyDb);
  }
  return structuredClone(emptyDb);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AppDatabase>(loadDb);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [db]);

  const resetDb = () => setDb(structuredClone(emptyDb));

  const addInvoice = (invoice: Invoice) => {
    setDb((prev) => ({ ...prev, invoices: [...prev.invoices, invoice] }));
  };

  const runPaymentChain = (prev: AppDatabase, invoiceId: string, amount: number, method: PaymentMethod, date: string, reference: string): { next: AppDatabase; payment: Payment; projectCreated: boolean } => {
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
    return { next, payment, projectCreated: !hasProject };
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
      return null;
    }
    let result: LogPaymentResult | null = null;
    setDb((prev) => {
      const invoice = prev.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return prev;
      if (invoice.status === 'Paid' && getInvoiceBalance(invoice) <= 0) return prev;
      const balance = getInvoiceBalance(invoice);
      if (balance <= 0) {
        return { ...prev, invoices: prev.invoices.map((item) => item.id === invoiceId ? { ...item, status: 'Paid' } : item) };
      }
      const chain = runPaymentChain(prev, invoiceId, balance, 'Bank Transfer', todayISO(), invoice.invoiceNumber);
      result = { payment: chain.payment, projectCreated: chain.projectCreated };
      return chain.next;
    });
    return result;
  };

  const addAccountingEntry = (entry: AccountingEntry) => {
    setDb((prev) => ({ ...prev, accounting: [...prev.accounting, entry] }));
  };

  const addProject = (project: Project) => {
    setDb((prev) => ({ ...prev, projects: [...prev.projects, project] }));
  };

  const updateProject = (projectId: string, updates: Partial<Omit<Project, 'id'>>) => {
    setDb((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
    }));
  };

  const updateProjectStatus = (projectId: string, status: Project['status']) => {
    setDb((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => project.id === projectId ? { ...project, status } : project),
    }));
  };

  const addClient = (client: Client) => {
    setDb((prev) => ({ ...prev, clients: [...prev.clients, client] }));
  };

  const updateClient = (client: Client) => {
    setDb((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === client.id ? client : c)),
    }));
  };

  const deleteClient = (clientId: string) => {
    setDb((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== clientId),
    }));
    window.dispatchEvent(new Event('clients_updated'));
  };

  const addQuotation = (quotation: Quotation) => {
    setDb((prev) => ({ ...prev, quotations: [...prev.quotations, quotation] }));
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
      return {
        ...prev,
        invoices: [...prev.invoices, invoice],
        quotations: prev.quotations.map((q) => q.id === quotationId ? { ...q, status: 'Accepted' } : q),
        subscriptions: linkedSub
          ? prev.subscriptions.map((s) => s.referenceId === quotationId ? { ...s, invoiceId: invoice.id, origin: 'quotation' } : s)
          : prev.subscriptions,
      };
    });
  };

  const addSubscription = (subscription: Subscription) => {
    setDb((prev) => ({ ...prev, subscriptions: [...prev.subscriptions, subscription] }));
  };

  const updateSubscriptionStatus = (subscriptionId: string, status: SubscriptionStatus) => {
    setDb((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((sub) => sub.id === subscriptionId ? { ...sub, status } : sub),
    }));
  };

  const deleteSubscription = (subscriptionId: string) => {
    setDb((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.filter((sub) => sub.id !== subscriptionId),
    }));
  };

  const renewSubscription = (subscriptionId: string) => {
    setDb((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((sub) =>
        sub.id === subscriptionId
          ? { ...sub, nextBillingDate: calculateNextBillingDate(todayISO(), sub.billingCycle), status: 'active' as SubscriptionStatus }
          : sub
      ),
    }));
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
      return {
        ...prev,
        invoices: [...prev.invoices, invoice],
        subscriptions: prev.subscriptions.map((s) =>
          s.id === subscriptionId
            ? { ...s, invoiceId: invoice.id, nextBillingDate: calculateNextBillingDate(todayISO(), s.billingCycle) }
            : s
        ),
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
    setDb((prev) => ({
      ...prev,
      quotations: prev.quotations.filter((q) => q.id !== quotationId),
      subscriptions: prev.subscriptions.filter((sub) => sub.referenceId !== quotationId),
    }));
  };

  const deletePayment = (paymentId: string) => {
    setDb((prev) => {
      const payment = prev.payments.find((p) => p.id === paymentId);
      if (!payment) return prev;
      const invoice = prev.invoices.find((inv) => inv.id === payment.invoiceId);
      const accountingRef = payment.reference || invoice?.invoiceNumber || '';
      let updatedInvoices = prev.invoices;
      if (invoice) {
        const newPaidAmount = Math.max(invoice.paidAmount - payment.amount, 0);
        const total = getInvoiceTotal(invoice.items);
        const newBalance = Math.max(total - newPaidAmount, 0);
        const dueDate = new Date(invoice.dueDate);
        const finalStatus: InvoiceStatus =
          newPaidAmount <= 0
            ? dueDate < new Date() ? 'Overdue' : 'Unpaid'
            : newPaidAmount < total ? 'Partial' : 'Paid';
        updatedInvoices = prev.invoices.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, paidAmount: newPaidAmount, balanceDue: newBalance, status: finalStatus }
            : inv
        );
      }
      const paymentsForRef = prev.payments.filter(
        (p) => p.invoiceId === payment.invoiceId && (p.reference || invoice?.invoiceNumber) === accountingRef
      );
      const isLastPaymentWithRef = paymentsForRef.length <= 1;
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
      }
      if (newSubs.length === 0) return prev;
      return { ...prev, subscriptions: [...prev.subscriptions, ...newSubs] };
    });
  };

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
