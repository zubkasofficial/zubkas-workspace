export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Partial';
export type ProjectStatus = 'Not Started' | 'In Progress' | 'In Review' | 'Completed';
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Card';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  taxNumber?: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export type QuotationTaxType = 'cgst_sgst' | 'igst' | 'custom' | 'none';

export interface Quotation {
  id: string;
  quoteNumber: string;
  clientId: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  notes: string;
  status: QuotationStatus;
  createdAt: string;
  quotationType?: 'service' | 'subscription';
  subscriptionCategory?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  taxEnabled?: boolean;
  taxType?: QuotationTaxType;
  taxRate?: number;
  taxLabel?: string;
  discountValue?: number;
  discountUnit?: 'flat' | 'percent';
  showBankDetails?: boolean;
  showUpiDetails?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
}

export type InvoiceTaxType = 'cgst_sgst' | 'igst' | 'custom' | 'none';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  notes: string;
  status: InvoiceStatus;
  paidAmount: number;
  balanceDue: number;
  createdAt: string;
  invoiceType?: 'regular' | 'recurring';
  subscriptionCategory?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionId?: string;
  referenceId?: string;
  taxEnabled?: boolean;
  taxType?: InvoiceTaxType;
  taxRate?: number;
  taxLabel?: string;
  discountValue?: number;
  discountUnit?: 'flat' | 'percent';
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  reference: string;
  notes: string;
}

export interface AccountingEntry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  reference: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  budget: number;
  invoiceId?: string;
  assignedMemberIds?: string[];
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  status: SubscriptionStatus;
  clientId?: string;
  referenceId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  invoiceId?: string;
  origin?: 'quotation' | 'manual';
}

export interface AppDatabase {
  clients: Client[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  accounting: AccountingEntry[];
  projects: Project[];
  subscriptions: Subscription[];
}

export type EmployeeStatus = 'Active' | 'Inactive';

export interface EmployeePermissions {
  [key: string]: boolean;
  dashboard: boolean;
  clients: boolean;
  quotations: boolean;
  invoices: boolean;
  payments: boolean;
  accounting: boolean;
  projects: boolean;
  tasks: boolean;
  subscriptions: boolean;
  reports: boolean;
  employees: boolean;
  settings: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  category: string;
  phone: string;
  status: EmployeeStatus;
  permissions: EmployeePermissions;
  created_at: string;
}

export type UserRole = 'admin' | 'employee';

export interface CurrentUser {
  role: UserRole;
  name: string;
  email: string;
  permissions: Record<string, boolean>;
  employeeId?: string;
}
