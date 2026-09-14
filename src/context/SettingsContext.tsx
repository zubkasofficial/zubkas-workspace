import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface CompanyProfile {
  logo: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  gstin: string;
  taxNumber?: string;
  taxLabel?: string;
}

export interface PaymentAccount {
  id: string;
  accountName: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifsc: string;
  swift: string;
  upiId: string;
  isDefault: boolean;
  qrCode?: string;
}

export interface TaxSettings {
  name: string;
  rate: number;
  enabled: boolean;
}

export interface AppSettings {
  profile: CompanyProfile;
  paymentAccounts: PaymentAccount[];
  tax: TaxSettings;
  terms: string[];
}

interface SettingsContextValue {
  settings: AppSettings;
  updateProfile: (profile: CompanyProfile) => void;
  updatePaymentAccounts: (accounts: PaymentAccount[]) => void;
  updateTax: (tax: TaxSettings) => void;
  updateTerms: (terms: string[]) => void;
  defaultPaymentAccount: PaymentAccount | undefined;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const PROFILE_KEY = 'zubkas_settings_profile';
const PAYMENT_ACCOUNTS_KEY = 'zubkas_settings_payment_accounts';
const TAX_KEY = 'zubkas_tax_settings';
const TERMS_KEY = 'zubkas_settings_terms';

const DEFAULT_PROFILE: CompanyProfile = {
  logo: '',
  name: 'ZUBKAS TECHNOLOGY PRIVATE LIMITED',
  email: 'accounts@zubkas.com',
  phone: '+91 44 1234 5678',
  website: 'www.zubkas.com',
  address: 'Tidel Park, Taramani, Chennai, Tamil Nadu 600113',
  gstin: '33AABCC1234D1Z5',
  taxNumber: '',
  taxLabel: '',
};

const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  { id: 'pa1', accountName: 'Zubkas Technology', bankName: 'HDFC Bank', branchName: 'Taramani', accountNumber: '50200012345678', ifsc: 'HDFC0001234', swift: 'HDFCINBB', upiId: 'zubkas@hdfcbank', isDefault: true, qrCode: '' },
];

const DEFAULT_TAX: TaxSettings = { name: 'GST', rate: 18, enabled: true };

const DEFAULT_TERMS = [
  'Advance: 50% with order, balance before delivery.',
  'All prices are in Indian Rupees (INR) unless stated otherwise.',
  'Lead time: 10-15 working days from receipt of advance.',
  'GST as applicable will be charged extra on the above prices.',
  'This offer is valid for 15 days from the date of quotation.',
];

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function loadTaxSettings(): TaxSettings {
  // Try new key first
  try {
    const raw = localStorage.getItem(TAX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaxSettings>;
      if (parsed.name !== undefined && parsed.rate !== undefined) {
        return { name: parsed.name, rate: parsed.rate, enabled: parsed.enabled ?? true };
      }
    }
  } catch { /* ignore */ }
  // Migrate from old key
  try {
    const raw = localStorage.getItem('zubkas_settings_tax');
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        name: (parsed.taxLabel as string) ?? 'GST',
        rate: (parsed.gst as number) ?? 18,
        enabled: (parsed.enableTaxByDefault as boolean) ?? true,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_TAX;
}

function loadSettings(): AppSettings {
  return {
    profile: loadSetting(PROFILE_KEY, DEFAULT_PROFILE),
    paymentAccounts: loadSetting(PAYMENT_ACCOUNTS_KEY, DEFAULT_PAYMENT_ACCOUNTS),
    tax: loadTaxSettings(),
    terms: loadSetting(TERMS_KEY, DEFAULT_TERMS),
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateProfile = useCallback((profile: CompanyProfile) => {
    setSettings((prev) => ({ ...prev, profile }));
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
  }, []);

  const updatePaymentAccounts = useCallback((accounts: PaymentAccount[]) => {
    setSettings((prev) => ({ ...prev, paymentAccounts: accounts }));
    try { localStorage.setItem(PAYMENT_ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* ignore */ }
  }, []);

  const updateTax = useCallback((tax: TaxSettings) => {
    setSettings((prev) => ({ ...prev, tax }));
    try { localStorage.setItem(TAX_KEY, JSON.stringify(tax)); } catch { /* ignore */ }
  }, []);

  const updateTerms = useCallback((terms: string[]) => {
    setSettings((prev) => ({ ...prev, terms }));
    try { localStorage.setItem(TERMS_KEY, JSON.stringify(terms)); } catch { /* ignore */ }
  }, []);

  const defaultPaymentAccount = settings.paymentAccounts.find((a) => a.isDefault) ?? settings.paymentAccounts[0];

  return (
    <SettingsContext.Provider value={{ settings, updateProfile, updatePaymentAccounts, updateTax, updateTerms, defaultPaymentAccount }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
