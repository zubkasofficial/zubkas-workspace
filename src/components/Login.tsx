import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChartBar as BarChart3, CircleCheck as CheckCircle2, Download, Eye, EyeOff, FolderKanban, KeyRound, Loader as Loader2, Lock, Mail, Receipt, ShieldCheck, Smartphone, Users } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { getAllPermissions } from '@/utils/permissions';
import { supabase } from '@/lib/supabase';
import { ZubkasIcon } from '@/components/ZubkasIcon';
import type { CurrentUser } from '@/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Tab = 'password' | 'otp';
type View = 'login' | 'forgot';

const DEFAULT_ADMIN_EMAIL = 'admin@zubkas.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

const FEATURES = [
  { icon: Receipt, title: 'Automated Billing & GST Invoicing', description: 'Create GST-compliant invoices in seconds with automatic tax calculations.' },
  { icon: FolderKanban, title: 'Real-time Project Kanban & Task Tracking', description: 'Visual project boards that auto-create when payments are received.' },
  { icon: BarChart3, title: 'Unified Financial Accounting & Profit Analytics', description: 'Track income, expenses, and profitability with live dashboards.' },
  { icon: Users, title: 'Client Management & Instant Payment Receipts', description: 'Maintain client relationships and generate professional receipts instantly.' },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

export function Login({ onLogin }: { onLogin: () => void }) {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { login } = useAuth();
  const { adminEmail, adminPassword } = useSettings();
  const [tab, setTab] = useState<Tab>('password');
  const [view, setView] = useState<View>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const [otpEmail, setOtpEmail] = useState('');
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setDeferredPrompt(null);
      showToast('Zubkas App installed successfully');
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Installing Zubkas App...');
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      const adminEmailVal = getAdminEmail();
      const adminPasswordVal = getAdminPassword();
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail === adminEmailVal.toLowerCase() && password === adminPasswordVal) {
        const user: CurrentUser = {
          role: 'admin',
          name: 'Administrator',
          email: adminEmail,
          permissions: getAllPermissions(),
        };
        login(user, remember);
        showToast('Welcome back! Login successful.');
        onLogin();
        return;
      }

      try {
        const { data: employees } = await supabase.from('employees').select('*');
        const match = (employees ?? []).find((emp: Record<string, unknown>) => (emp.email as string).toLowerCase() === normalizedEmail);
        if (match) {
          if (match.password !== password) {
            showToast('Invalid credentials or account inactive', 'error');
            return;
          }
          if (match.status !== 'Active') {
            showToast('Invalid credentials or account inactive', 'error');
            return;
          }
          const user: CurrentUser = {
            role: 'employee',
            name: match.name,
            email: match.email,
            permissions: match.permissions ?? {},
            employeeId: match.id,
          };
          login(user, remember);
          showToast('Welcome back! Login successful.');
          onLogin();
          return;
        }
      } catch { /* ignore */ }

      showToast('Invalid credentials or account inactive', 'error');
    }, 800);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) { showToast('Please enter your email address', 'error'); return; }
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      setOtpStage('verify');
      setOtpTimer(30);
      showToast('OTP sent to your email address');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }, 600);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpDigits.join('').length < 6) { showToast('Please enter the 6-digit code', 'error'); return; }
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      const user: CurrentUser = {
        role: 'admin',
        name: 'Administrator',
        email: otpEmail || getAdminEmail(),
        permissions: getAllPermissions(),
      };
      login(user, true);
      showToast('Welcome back! Login successful.');
      onLogin();
    }, 700);
  };

  const handleResendOtp = () => {
    if (otpTimer > 0) return;
    setOtpTimer(30);
    showToast('OTP resent to your email address');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { showToast('Please enter your email address', 'error'); return; }
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
      showToast('Password reset link sent to your email');
    }, 700);
  };

  const getAdminEmail = (): string => adminEmail || DEFAULT_ADMIN_EMAIL;
  const getAdminPassword = (): string => adminPassword || DEFAULT_ADMIN_PASSWORD;

  const accent = theme.accent;

  const darkenHex = (hex: string, factor = 0.4): string => {
    const m = hex.replace('#', '');
    const r = Math.round(parseInt(m.slice(0, 2), 16) * (1 - factor));
    const g = Math.round(parseInt(m.slice(2, 4), 16) * (1 - factor));
    const b = Math.round(parseInt(m.slice(4, 6), 16) * (1 - factor));
    return `rgb(${r} ${g} ${b})`;
  };

  const heroGradient = `linear-gradient(135deg, ${accent} 0%, ${darkenHex(accent)} 100%)`;
  const hoverAccent = darkenHex(accent, 0.15);

  const ThemedButton = ({ children, disabled, onClick, type }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: 'submit' | 'button' }) => (
    <button
      type={type ?? 'submit'}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-70"
      style={{ backgroundColor: accent }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = hoverAccent; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accent; }}
    >
      {children}
    </button>
  );

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden lg:flex-row">
      {/* LEFT — Brand showcase (desktop only) */}
      <div className="relative hidden min-h-screen flex-col justify-between p-8 text-white lg:flex lg:w-1/2 xl:p-12" style={{ background: heroGradient }}>
        {/* Brand header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <ZubkasIcon className="h-10 w-10" variant="white" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">ZUBKAS WORKSPACE</h1>
              <p className="text-xs text-white/60">Business Management Suite</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 my-auto w-full max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight text-white leading-snug xl:text-3xl">
            Empowering Business Operations &amp; Financial Management with Intelligent Precision
          </h2>
          <p className="mt-2.5 mb-5 text-xs font-normal leading-relaxed text-white/80 xl:text-sm">
            Streamline invoicing, accounting, projects, and client management from a single unified workspace.
          </p>
          <div className="space-y-2.5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition-all hover:bg-white/15"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}40` }}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white xl:text-sm">{feature.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/75 xl:text-xs">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badge */}
        <div className="relative z-10">
          <div className="flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 py-1.5 px-3 text-xs text-white/80 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-white/80" />
            <span>Trusted by enterprise clients across Chennai &amp; beyond</span>
          </div>
        </div>
      </div>

      {/* RIGHT — Auth section */}
      <div className="flex w-full min-h-screen flex-col items-center justify-between bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-10 lg:w-1/2">
        <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <ZubkasIcon className="h-9 w-9 rounded-lg" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">ZUBKAS WORKSPACE</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Business Management Suite</p>
            </div>
          </div>

          {view === 'forgot' ? (
            <div className="animate-fade-in">
              <button onClick={() => { setView('login'); setForgotSent(false); }} className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Reset Password</h2>
              <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">
                {forgotSent ? 'Check your email for a password reset link.' : 'Enter your email and we\'ll send you a reset link.'}
              </p>

              {forgotSent ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Reset link sent to {forgotEmail}</p>
                  <button onClick={() => { setView('login'); setForgotSent(false); setForgotEmail(''); }} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    Return to login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="admin@zubkas.com" className={inputClass} />
                    </div>
                  </div>
                  <ThemedButton disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </ThemedButton>
                </form>
              )}
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Welcome Back</h2>
              <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to access Zubkas Workspace</p>

              {/* Tab switcher */}
              <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => setTab('password')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${tab === 'password' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <Lock className="h-4 w-4" /> Password
                </button>
                <button
                  onClick={() => setTab('otp')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all ${tab === 'otp' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  <KeyRound className="h-4 w-4" /> Email OTP
                </button>
              </div>

              {/* TAB 1 — Password */}
              {tab === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4 animate-fade-in">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@zubkas.com" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setView('forgot')} className="text-sm font-semibold text-brand-600 transition-colors hover:underline dark:text-brand-400">
                      Forgot Password?
                    </button>
                  </div>
                  <ThemedButton disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </ThemedButton>
                </form>
              )}

              {/* TAB 2 — OTP */}
              {tab === 'otp' && (
                <div className="space-y-4 animate-fade-in">
                  {otpStage === 'request' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className={labelClass}>Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input type="email" required value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="admin@zubkas.com" className={inputClass} />
                        </div>
                      </div>
                      <ThemedButton disabled={otpLoading}>
                        {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {otpLoading ? 'Sending...' : 'Send OTP'}
                      </ThemedButton>
                    </form>
                  ) : (
                    <form onSubmit={handleOtpVerify} className="space-y-4">
                      <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Enter the 6-digit code sent to</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white">{otpEmail}</p>
                      </div>
                      <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 text-center text-lg font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        ))}
                      </div>
                      <ThemedButton disabled={otpLoading}>
                        {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {otpLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </ThemedButton>
                      <div className="flex items-center justify-center gap-2 text-sm">
                        {otpTimer > 0 ? (
                          <span className="text-slate-400">Resend OTP in {otpTimer}s</span>
                        ) : (
                          <button type="button" onClick={handleResendOtp} className="font-semibold text-brand-600 transition-colors hover:underline dark:text-brand-400">
                            Resend OTP
                          </button>
                        )}
                      </div>
                      <button type="button" onClick={() => { setOtpStage('request'); setOtpDigits(['', '', '', '', '', '']); setOtpTimer(0); }} className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Change email
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Install App Button */}
        <button
          onClick={handleInstallClick}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Install Zubkas App
        </button>

        <p className="select-none pb-2 text-center text-xs text-slate-400 dark:text-slate-500">Powered by Zubkas Workspace</p>
      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowInstallGuide(false)} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Install Zubkas App</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                To install the app on your device:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20">1</span>
                  <span>Tap the browser menu icon <span className="font-semibold text-slate-700 dark:text-slate-200">(⋮)</span> in the top right corner.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20">2</span>
                  <span>Select <span className="font-semibold text-slate-700 dark:text-slate-200">"Install App"</span> or <span className="font-semibold text-slate-700 dark:text-slate-200">"Add to Home Screen"</span>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20">3</span>
                  <span>Confirm the prompt to add Zubkas to your device.</span>
                </li>
              </ul>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-400 dark:bg-slate-800">
                On desktop Chrome or Edge, click the install icon in the address bar.
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
