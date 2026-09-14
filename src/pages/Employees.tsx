import { Plus, Search, Settings as SettingsIcon, Trash2, Pencil, UserCog, Mail, Phone, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeCategories } from '@/hooks/useEmployeeCategories';
import { useToast } from '@/context/ToastContext';
import { EmployeeModal } from '@/components/EmployeeModal';
import { EmployeeCategoryModal } from '@/components/EmployeeCategoryModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PERMISSION_KEYS, PERMISSION_LABELS } from '@/utils/permissions';
import type { Employee } from '@/types';

const CATEGORY_PILL_COLORS = [
  'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
];

function getCategoryPill(category: string, categories: string[]): string {
  const index = categories.indexOf(category);
  return CATEGORY_PILL_COLORS[index % CATEGORY_PILL_COLORS.length] ?? CATEGORY_PILL_COLORS[0];
}

export function Employees() {
  const { employees, updateEmployee, deleteEmployee } = useEmployees();
  const { categories } = useEmployeeCategories();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = `${emp.name} ${emp.email} ${emp.phone}`.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || emp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [employees, search, categoryFilter]);

  const activeCount = employees.filter((e) => e.status === 'Active').length;

  const openCreate = () => { setEditingEmployee(null); setModalOpen(true); };
  const openEdit = (emp: Employee) => { setEditingEmployee(emp); setModalOpen(true); };

  const toggleStatus = (emp: Employee) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    updateEmployee(emp.id, { status: newStatus });
    showToast(`Employee ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteEmployee(deleteTarget.id);
    showToast('Employee deleted successfully');
    setDeleteTarget(null);
  };

  const getEnabledPermissions = (emp: Employee): string[] => {
    return PERMISSION_KEYS.filter((key) => Boolean((emp.permissions as Record<string, boolean>)[key]));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Employee Management</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage staff accounts, departments, and module permissions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <SettingsIcon className="h-4 w-4" /> Manage Categories
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#9f0f0f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#850c0c]"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Employees" value={String(employees.length)} icon={UserCog} color="brand" />
        <StatCard title="Active Staff" value={String(activeCount)} icon={UserCog} color="emerald" />
        <StatCard title="Departments" value={String(categories.length)} icon={Tag} color="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option>All</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold">Phone</th>
                  <th className="px-6 py-3 font-semibold">Permissions</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((emp) => {
                  const enabledPerms = getEnabledPermissions(emp);
                  return (
                    <tr key={emp.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-sm font-bold text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{emp.name}</p>
                            <p className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail className="h-3 w-3" /> {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryPill(emp.category, categories)}`}>
                          {emp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {emp.phone || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {enabledPerms.length > 0 ? (
                            enabledPerms.slice(0, 5).map((key) => (
                              <span key={key} className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                                {PERMISSION_LABELS[key] ?? key}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">No access</span>
                          )}
                          {enabledPerms.length > 5 && (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              +{enabledPerms.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(emp)}
                          role="switch"
                          aria-checked={emp.status === 'Active'}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          title={emp.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${emp.status === 'Active' ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(emp)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                            title="Edit employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                            title="Delete employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <UserCog className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                {employees.length === 0 ? 'No employees yet' : 'No employees found'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {employees.length === 0 ? 'Add your first team member to get started.' : 'Try adjusting your search or category filter.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing {filtered.length} of {employees.length} employees
        </div>
      </div>

      <EmployeeModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingEmployee(null); }} editingEmployee={editingEmployee} />
      <EmployeeCategoryModal open={catModalOpen} onClose={() => setCatModalOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Employee?"
        message={
          <>
            <p>Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-100">{deleteTarget?.name}</span>?</p>
            <p className="mt-2 text-xs text-slate-400">This will remove their account and they will no longer be able to log in. This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof UserCog; color: 'brand' | 'emerald' | 'amber' }) {
  const styles = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
