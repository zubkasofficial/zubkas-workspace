import { Check, Eye, EyeOff, Image as ImageIcon, Plus, Star, Trash2, Upload, X, QrCode } from 'lucide-react';
import { useRef, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings, type PaymentAccount } from '@/context/SettingsContext';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';
const btnPrimary = 'rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900';

const ACCENT_PRESETS = [
  { name: 'Crimson', value: '#9f0f0f' },
  { name: 'Ocean Blue', value: '#0f4f9f' },
  { name: 'Forest Green', value: '#0f7a3e' },
  { name: 'Sunset Orange', value: '#c4570f' },
  { name: 'Royal Purple', value: '#6b21a8' },
  { name: 'Slate Gray', value: '#475569' },
];

function newPaymentAccount(): PaymentAccount {
  return { id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, accountName: '', bankName: '', branchName: '', accountNumber: '', ifsc: '', swift: '', upiId: '', isDefault: false, qrCode: '' };
}

export function Settings() {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Workspace Settings</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure your business profile, payment accounts, and preferences</p>
      </div>
      <CompanyProfileCard showToast={showToast} />
      <PaymentAccountsCard showToast={showToast} />
      <TermsCard showToast={showToast} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminProfileCard showToast={showToast} />
        <TaxSettingsCard showToast={showToast} />
      </div>
      <ThemeCard showToast={showToast} />
    </div>
  );
}

const BRAND_BADGE = 'p-2 bg-red-50 border border-red-100 rounded-lg dark:bg-red-950/30 dark:border-red-900/40';

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${BRAND_BADGE}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
    </div>
  );
}

function CompanyProfileCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { settings, updateProfile } = useSettings();
  const profile = settings.profile;
  const taxName = settings.tax.name || 'Tax';
  const [logoUrl, setLogoUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { showToast('Logo must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => updateProfile({ ...profile, logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateProfile(profile);
    showToast('Company profile saved successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Company Profile" description="These details appear on every invoice and quotation" />
      <div className="mt-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {profile.logo ? (
                <img src={profile.logo} alt="Company logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                <Upload className="h-3.5 w-3.5" /> Upload
              </button>
              {profile.logo && (
                <button onClick={() => updateProfile({ ...profile, logo: '' })} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass}>Logo URL (optional)</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className={inputClass} />
              {logoUrl && <button onClick={() => { updateProfile({ ...profile, logo: logoUrl }); setLogoUrl(''); showToast('Logo URL applied'); }} className="mt-1.5 text-xs font-semibold text-brand-600 hover:underline">Use this URL</button>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base App Branding Logo</label>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-4">
            <img src="/zubkas-logo.png" alt="Zubkas Logo" className="h-12 w-auto" />
            <span className="text-xs text-gray-500">(This permanent logo is used on all documents)</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Company Name</label>
            <input value={profile.name} onChange={(e) => updateProfile({ ...profile, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={profile.email} onChange={(e) => updateProfile({ ...profile, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={profile.phone} onChange={(e) => updateProfile({ ...profile, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input value={profile.website} onChange={(e) => updateProfile({ ...profile, website: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Address</label>
            <textarea value={profile.address} onChange={(e) => updateProfile({ ...profile, address: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tax Name / Label</label>
            <input value={profile.taxLabel ?? ''} onChange={(e) => updateProfile({ ...profile, taxLabel: e.target.value })} placeholder="e.g. GST, VAT, TRN, Tax ID" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tax Number / Registration ID</label>
            <input value={profile.taxNumber ?? profile.gstin ?? ''} onChange={(e) => updateProfile({ ...profile, taxNumber: e.target.value, gstin: e.target.value })} placeholder="e.g. 33AABCC1234D1Z5, 100234567800003" className={inputClass} />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={save} className={btnPrimary}>Save Company Profile</button>
        </div>
      </div>
    </div>
  );
}

function PaymentAccountsCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { settings, updatePaymentAccounts } = useSettings();
  const [accounts, setAccounts] = useState<PaymentAccount[]>(settings.paymentAccounts);
  const qrRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = (id: string, field: keyof PaymentAccount, value: string | boolean) =>
    setAccounts((prev) => prev.map((acc) => acc.id === id ? { ...acc, [field]: value } : acc));

  const setDefault = (id: string) =>
    setAccounts((prev) => prev.map((acc) => ({ ...acc, isDefault: acc.id === id })));

  const remove = (id: string) =>
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));

  const add = () => setAccounts((prev) => [...prev, newPaymentAccount()]);

  const handleQrUpload = (id: string, file: File) => {
    if (file.size > 2 * 1024 * 1024) { showToast('QR code image must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => update(id, 'qrCode', reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    const valid = accounts.filter((acc) => acc.accountName || acc.bankName);
    if (valid.length === 0) { showToast('Add at least one payment account', 'error'); return; }
    if (!valid.some((acc) => acc.isDefault)) valid[0].isDefault = true;
    setAccounts(valid);
    updatePaymentAccounts(valid);
    showToast('Payment accounts saved successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Payment Accounts" description="Bank and UPI details shown on invoices for customer payments" />
      <div className="mt-6 space-y-5">
        {accounts.map((acc) => (
          <div key={acc.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {acc.isDefault && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Star className="h-3 w-3 fill-current" /> Default</span>}
                {!acc.isDefault && (
                  <button onClick={() => setDefault(acc.id)} className="text-xs font-semibold text-slate-400 hover:text-amber-600">Set as default</button>
                )}
              </div>
              <button onClick={() => remove(acc.id)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className={labelClass}>Account Name</label><input value={acc.accountName} onChange={(e) => update(acc.id, 'accountName', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Bank Name</label><input value={acc.bankName} onChange={(e) => update(acc.id, 'bankName', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Branch Name</label><input value={acc.branchName} onChange={(e) => update(acc.id, 'branchName', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Account Number</label><input value={acc.accountNumber} onChange={(e) => update(acc.id, 'accountNumber', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>IFSC Code</label><input value={acc.ifsc} onChange={(e) => update(acc.id, 'ifsc', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Swift Code</label><input value={acc.swift} onChange={(e) => update(acc.id, 'swift', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>UPI ID</label><input value={acc.upiId} onChange={(e) => update(acc.id, 'upiId', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
              <label className={labelClass}>UPI QR Code</label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
                  {acc.qrCode ? (
                    <img src={acc.qrCode} alt="UPI QR Code" className="h-full w-full object-contain" />
                  ) : (
                    <QrCode className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => qrRefs.current[acc.id]?.click()} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                    <Upload className="h-3.5 w-3.5" /> Upload QR Code
                  </button>
                  {acc.qrCode && (
                    <button onClick={() => update(acc.id, 'qrCode', '')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                <input ref={(el) => { qrRefs.current[acc.id] = el; }} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleQrUpload(acc.id, file); }} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
          <Plus className="h-4 w-4" /> Add Payment Account
        </button>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button onClick={save} className={btnPrimary}>Save Payment Accounts</button>
        </div>
      </div>
    </div>
  );
}

function TermsCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { settings, updateTerms } = useSettings();
  const [terms, setTerms] = useState<string[]>(settings.terms);
  const [newTerm, setNewTerm] = useState('');

  const add = () => {
    if (!newTerm.trim()) return;
    setTerms((prev) => [...prev, newTerm.trim()]);
    setNewTerm('');
  };

  const remove = (index: number) => setTerms((prev) => prev.filter((_, i) => i !== index));

  const save = () => {
    updateTerms(terms);
    showToast('Default terms saved successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Default Terms & Conditions" description="These pre-fill into every new quotation and invoice" />
      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          {terms.map((term, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20">{index + 1}</span>
              <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{term}</p>
              <button onClick={() => remove(index)} className="text-slate-400 transition-colors hover:text-rose-600"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {terms.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No terms yet — add one below</p>}
        </div>
        <div className="flex gap-2">
          <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Type a new term and press Enter..." className={inputClass} />
          <button onClick={add} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add Term
          </button>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button onClick={save} className={btnPrimary}>Save Default Terms</button>
        </div>
      </div>
    </div>
  );
}

function AdminProfileCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { adminEmail, updateAdminCredentials } = useSettings();
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const saveEmail = () => {
    if (!email.trim()) { showToast('Email cannot be empty', 'error'); return; }
    updateAdminCredentials(email.trim());
    showToast('Admin email saved successfully');
  };

  const updatePassword = () => {
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    updateAdminCredentials(adminEmail, password);
    setPassword('');
    showToast('Password updated successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Admin Profile & Credentials" description="Manage your workspace login credentials" />
      <div className="mt-6 space-y-4">
        <div>
          <label className={labelClass}>Admin Email</label>
          <div className="flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            <button onClick={saveEmail} className={`shrink-0 ${btnPrimary}`}>Save Email</button>
          </div>
        </div>
        <div>
          <label className={labelClass}>Change Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className={inputClass} />
              <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={updatePassword} className={`shrink-0 ${btnPrimary}`}>Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxSettingsCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { settings, updateTax } = useSettings();
  const companyProfile = settings.profile;
  const [rate, setRate] = useState(String(settings.tax.rate));
  const [enabled, setEnabled] = useState(settings.tax.enabled);

  const save = () => {
    const parsedRate = Number(rate);
    const activeName = companyProfile.taxLabel?.trim() || settings.tax.name || 'Tax';
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) { showToast('Tax percentage must be between 0 and 100', 'error'); return; }
    updateTax({ name: activeName, rate: parsedRate, enabled });
    showToast('Tax settings updated successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Tax Configuration" description="Tax rate and default behavior for invoices and quotations" />
      <div className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-end">
            <label className={labelClass}>Tax Type</label>
            <div className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{companyProfile.taxLabel?.trim() || settings.tax.name || 'Tax'}</span>
              <span className="ml-2 text-xs text-slate-400">(set in Company Profile)</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tax Percentage (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="18" className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enable Tax on New Documents</p>
            <p className="mt-0.5 text-xs text-slate-400">When on, new quotations and invoices start with tax applied. You can still toggle it off per document.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-[#9f0f0f]' : 'bg-slate-300 dark:bg-slate-600'}`}
            aria-label="Toggle default tax"
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button onClick={save} className="rounded-xl bg-[#9f0f0f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#850c0c]">Save Tax Settings</button>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const { theme, setMode, setAccent, applyTheme } = useTheme();

  const apply = () => {
    applyTheme();
    showToast('Theme applied successfully');
  };

  return (
    <div className={cardClass}>
      <SectionHeader icon={<img src="/icon-512.png" alt="Zubkas" className="h-5 w-5 object-contain" />} title="Theme & Styling" description="Customize the appearance of your workspace" />
      <div className="mt-6 space-y-5">
        <div>
          <label className={labelClass}>Appearance Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['light', 'dark'] as const).map((mode) => (
              <button key={mode} onClick={() => setMode(mode)} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold capitalize transition ${theme.mode === mode ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                {mode === 'light' ? 'Light' : 'Dark'}
                {theme.mode === mode && <Check className="ml-1.5 inline h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Accent Color</label>
          <div className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => (
              <button key={preset.value} onClick={() => setAccent(preset.value)} title={preset.name} className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition ${theme.accent === preset.value ? 'border-slate-900 dark:border-white' : 'border-transparent'}`} style={{ backgroundColor: preset.value }}>
                {theme.accent === preset.value && <Check className="h-5 w-5 text-white" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Color applies instantly. Click "Apply Theme" to save your preference.</p>
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button onClick={apply} className={btnPrimary}>Apply Theme</button>
        </div>
      </div>
    </div>
  );
}
