import { CalendarClock, SquareCheck as CheckSquare, Clock, Plus, Search, Trash2, TriangleAlert as AlertTriangle, Pencil, CircleUser as UserCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { useProjectTasks, isOverdue, isDueToday, type ProjectTask } from '@/hooks/useProjectTasks';
import { TaskModal } from '@/components/TaskModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
type AssigneeFilter = 'all' | 'mine';

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Tasks() {
  const { db } = useWorkspace();
  const { tasks, toggleTask, deleteTask } = useProjectTasks();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>(isEmployee ? 'mine' : 'all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTask | null>(null);

  const scopedTasks = useMemo(() => {
    if (isEmployee && user) {
      return tasks.filter((t) => t.assignedToId === user.employeeId);
    }
    if (assigneeFilter === 'mine' && user) {
      return tasks.filter((t) => t.assignedToId === user.employeeId || t.assignedToName === user.name);
    }
    return tasks;
  }, [tasks, assigneeFilter, user, isEmployee]);

  const metrics = useMemo(() => {
    const total = scopedTasks.length;
    const completed = scopedTasks.filter((t) => t.completed).length;
    const overdue = scopedTasks.filter(isOverdue).length;
    const today = scopedTasks.filter(isDueToday).length;
    const pending = total - completed;
    return { total, completed, overdue, today, pending };
  }, [scopedTasks]);

  const visibleProjectIds = useMemo(() => {
    if (!isEmployee || !user) return null;
    return new Set(
      db.projects
        .filter((p) =>
          p.assignedMemberIds?.includes(user.employeeId ?? '') ||
          tasks.some((t) => t.project_id === p.id && t.assignedToId === user.employeeId),
        )
        .map((p) => p.id),
    );
  }, [db.projects, tasks, isEmployee, user]);

  const filtered = useMemo(() => {
    return scopedTasks
      .filter((task) => {
        const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
        const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
        const matchesVisibility = !visibleProjectIds || visibleProjectIds.has(task.project_id);
        let matchesStatus = true;
        if (statusFilter === 'pending') matchesStatus = !task.completed;
        else if (statusFilter === 'completed') matchesStatus = task.completed;
        else if (statusFilter === 'overdue') matchesStatus = isOverdue(task);
        return matchesSearch && matchesProject && matchesStatus && matchesVisibility;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [scopedTasks, search, projectFilter, statusFilter, visibleProjectIds]);

  const openCreate = () => { setEditingTask(null); setModalOpen(true); };
  const openEdit = (task: ProjectTask) => { setEditingTask(task); setModalOpen(true); };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTask(deleteTarget.id);
    showToast('Task deleted successfully');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Project Tasks</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Assign, track deadlines, and organize deliverables across all client projects</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-[#9f0f0f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#850c0c]">
          <Plus className="h-4 w-4" /> Create Task
        </button>
      </div>

      <div className="flex items-center gap-2">
        {!isEmployee && (
          <button
            onClick={() => setAssigneeFilter('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              assigneeFilter === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="h-4 w-4" /> All Tasks
          </button>
        )}
        <button
          onClick={() => setAssigneeFilter('mine')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            assigneeFilter === 'mine'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <UserCircle2 className="h-4 w-4" /> Assigned to Me
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Tasks" value={metrics.total} icon={CheckSquare} color="brand" />
        <MetricCard title="Pending / Today" value={`${metrics.pending} / ${metrics.today}`} icon={Clock} color="amber" />
        <MetricCard title="Overdue" value={metrics.overdue} icon={AlertTriangle} color="rose" />
        <MetricCard title="Completed" value={metrics.completed} icon={CheckSquare} color="emerald" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by task title..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <option value="all">All Projects</option>
              {db.projects
                .filter((p) => !visibleProjectIds || visibleProjectIds.has(p.id))
                .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-6 py-3 font-semibold">Task Name</th>
                  <th className="px-6 py-3 font-semibold">Project & Client</th>
                  <th className="px-6 py-3 font-semibold">Assignee</th>
                  <th className="px-6 py-3 font-semibold">Priority</th>
                  <th className="px-6 py-3 font-semibold">Due Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <tr key={task.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleTask(task.id)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${task.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'}`}
                            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}>
                            {task.completed && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${task.completed ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
                            {task.description && <p className="mt-0.5 truncate text-xs text-slate-400">{task.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{task.project_name}</p>
                        <p className="text-xs text-slate-400">{task.client_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        {task.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
                              {task.assignedToName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{task.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PRIORITY_STYLES[task.priority ?? 'medium'] ?? PRIORITY_STYLES.medium}`}>
                          {task.priority ?? 'medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-sm ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          <CalendarClock className="h-3.5 w-3.5" />{formatDate(task.due_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.completed ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</span>
                        ) : overdue ? (
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Overdue</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(task)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit task">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(task)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" title="Delete task">
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
              <CheckSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{tasks.length === 0 ? 'No tasks yet' : 'No tasks found'}</p>
              <p className="mt-1 text-sm text-slate-400">{tasks.length === 0 ? 'Create your first task to start tracking.' : 'Try adjusting your search or filters.'}</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Showing {filtered.length} of {scopedTasks.length} tasks
        </div>
      </div>

      <TaskModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); }} editingTask={editingTask} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Task?"
        message={
          <>
            <p>Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-100">{deleteTarget?.title}</span>?</p>
            <p className="mt-2 text-xs text-slate-400">This action cannot be undone.</p>
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: typeof CheckSquare; color: 'brand' | 'amber' | 'rose' | 'emerald' }) {
  const styles = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
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
