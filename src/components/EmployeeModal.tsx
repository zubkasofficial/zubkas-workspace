import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, UserCog, X } from 'lucide-react';
import { inputClass, labelClass } from '@/components/Modal';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeCategories } from '@/hooks/useEmployeeCategories';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { PERMISSION_KEYS, PERMISSION_LABELS } from '@/utils/permissions';
import type { Employee, EmployeePermissions } from '@/types';

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  editingEmployee?: Employee | null;
}

function emptyPermissions(): EmployeePermissions {
  const result = {} as EmployeePermissions;
  for (const key of PERMISSION_KEYS) {
    (result as Record<string, boolean>)[key] = false;
  }
  result.dashboard = true;
  return result;
}

export function EmployeeModal({ open, onClose, editingEmployee }: EmployeeModalProps) {
  const { addEmployee, updateEmployee } = useEmployees();
  const { categories } = useEmployeeCategories();
  const { showToast } = useToast();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '');
  const [permissions, setPermissions] = useState<EmployeePermissions>(emptyPermissions);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingEmployee) {
        setName(editingEmployee.name);
        setEmail(editingEmployee.email);
        setPassword(editingEmployee.password);
        setPhone(editingEmployee.phone);
        setCategory(editingEmployee.category);
        setPermissions({ ...emptyPermissions(), ...editingEmployee.permissions });
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setCategory(categories[0] ?? '');
        setPermissions(emptyPermissions());
      }
      setShowPassword(false);
    }
  }, [open, editingEmployee, categories]);

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] } as EmployeePermissions));
  };

  const selectAll = () => {
    const all = {} as EmployeePermissions;
    for (const key of PERMISSION_KEYS) {
      (all as Record<string, boolean>)[key] = true;
    }
    setPermissions(all);
  };

  const deselectAll = () => setPermissions(emptyPermissions());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('Name, email, and password are required', 'error');
      return;
    }
    if (password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        category,
        permissions,
      });
      if (user?.role === 'employee' && user.email.toLowerCase() === editingEmployee.email.toLowerCase()) {
        updateUser({ permissions: { ...permissions } });
      }
      showToast('Employee updated successfully');
    } else {
      const emp: Employee = {
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        email: email.trim(),
        password,
        category,
        phone: phone.trim(),
        status: 'Active',
        permissions,
        created_at: new Date().toISOString(),
      };
      addEmployee(emp);
      showToast('Employee added successfully');
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 scrollbar-thin">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
              <UserCog className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full Name <span className="text-brand-600">*</span></label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-brand-600">*</span></label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@zubkas.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password <span className="text-brand-600">*</span></label>
              <div className="relative">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 4 characters" className={inputClass} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Department / Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {categories.length === 0 && <option value="" disabled>No categories configured</option>}
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Module Permissions</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="rounded-md bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-600/20 dark:bg-brand-600/20 dark:text-brand-400">
                  Select All
                </button>
                <button type="button" onClick={deselectAll} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_KEYS.map((key) => {
                const enabled = Boolean((permissions as Record<string, boolean>)[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePermission(key)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      enabled
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${enabled ? 'border-brand-600 bg-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {enabled && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {PERMISSION_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700">
              <Save className="h-4 w-4" /> {editingEmployee ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
