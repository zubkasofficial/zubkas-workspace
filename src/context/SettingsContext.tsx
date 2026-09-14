import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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
  adminEmail: string;
  adminPassword: string;
  updateAdminCredentials: (email: string, password?: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

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

const DEFAULT_SETTINGS: AppSettings = {
  profile: DEFAULT_PROFILE,
  paymentAccounts: DEFAULT_PAYMENT_ACCOUNTS,
  tax: DEFAULT_TAX,
  terms: DEFAULT_TERMS,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [adminEmail, setAdminEmail] = useState('admin@zubkas.com');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('profile, payment_accounts, tax, terms, admin_email, admin_password')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) {
        setLoaded(true);
        return;
      }

      setSettings({
        profile: (data.profile as CompanyProfile) ?? DEFAULT_PROFILE,
        paymentAccounts: (data.payment_accounts as PaymentAccount[]) ?? DEFAULT_PAYMENT_ACCOUNTS,
        tax: (data.tax as TaxSettings) ?? DEFAULT_TAX,
        terms: (data.terms as string[]) ?? DEFAULT_TERMS,
      });
      setAdminEmail(data.admin_email ?? 'admin@zubkas.com');
      setAdminPassword(data.admin_password ?? 'admin123');
      setLoaded(true);
    })();
  }, []);

  const persistSettings = useCallback(async (partial: Partial<{ profile: CompanyProfile; payment_accounts: PaymentAccount[]; tax: TaxSettings; terms: string[] }>) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, ...partial, updated_at: new Date().toISOString() });
    if (error) console.error('Failed to save settings:', error.message);
  }, []);

  const updateProfile = useCallback((profile: CompanyProfile) => {
    setSettings((prev) => ({ ...prev, profile }));
    persistSettings({ profile });
  }, [persistSettings]);

  const updatePaymentAccounts = useCallback((accounts: PaymentAccount[]) => {
    setSettings((prev) => ({ ...prev, paymentAccounts: accounts }));
    persistSettings({ payment_accounts: accounts });
  }, [persistSettings]);

  const updateTax = useCallback((tax: TaxSettings) => {
    setSettings((prev) => ({ ...prev, tax }));
    persistSettings({ tax });
  }, [persistSettings]);

  const updateTerms = useCallback((terms: string[]) => {
    setSettings((prev) => ({ ...prev, terms }));
    persistSettings({ terms });
  }, [persistSettings]);

  const updateAdminCredentials = useCallback((email: string, password?: string) => {
    setAdminEmail(email);
    if (password) setAdminPassword(password);
    const updates: Record<string, string> = { admin_email: email };
    if (password) updates.admin_password = password;
    supabase.from('app_settings').upsert({ id: 1, ...updates, updated_at: new Date().toISOString() }).then(({ error }) => {
      if (error) console.error('Failed to save admin credentials:', error.message);
    });
  }, []);

  const defaultPaymentAccount = settings.paymentAccounts.find((a) => a.isDefault) ?? settings.paymentAccounts[0];

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateProfile, updatePaymentAccounts, updateTax, updateTerms, defaultPaymentAccount, adminEmail, adminPassword, updateAdminCredentials }}>
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
