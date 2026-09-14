import { useState } from 'react';
import { Calendar, Eye, EyeOff, Mail, Save, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useEmployees } from '@/hooks/useEmployees';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900';

export function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { employees, updateEmployee } = useEmployees();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const employeeRecord = user.role === 'employee'
    ? employees.find((e) => e.email.toLowerCase() === user.email.toLowerCase())
    : null;

  const roleLabel = user.role === 'admin' ? 'Admin' : (employeeRecord?.category ?? 'Employee');
  const joinDate = employeeRecord?.created_at;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    if (!email.trim()) { showToast('Email cannot be empty', 'error'); return; }
    if (password && password.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }

    if (user.role === 'admin') {
      try { localStorage.setItem('zubkas_settings_admin_email', email.trim()); } catch { /* ignore */ }
      if (password) {
        try { localStorage.setItem('zubkas_settings_admin_password', btoa(password)); } catch { /* ignore */ }
      }
    } else if (employeeRecord) {
      updateEmployee(employeeRecord.id, {
        name: name.trim(),
        email: email.trim(),
        ...(password ? { password } : {}),
      });
    }

    updateUser({ name: name.trim(), email: email.trim() });
    setPassword('');
    showToast('Profile credentials updated successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">My Profile</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account details and login credentials</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">User Overview</h4>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your account information</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Shield className="h-4 w-4 text-slate-400" /> Role
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  user.role === 'admin'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {roleLabel}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Mail className="h-4 w-4 text-slate-400" /> Email
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4 text-slate-400" /> Member Since
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {joinDate ? new Date(joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">Update Credentials</h4>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Change your name, email, or password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-[#9f0f0f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#850c0c]">
                <Save className="h-4 w-4" /> Update Credentials
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
