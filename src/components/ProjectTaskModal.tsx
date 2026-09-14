import { SquareCheck as CheckSquare, Plus, Trash2, CalendarClock, CircleUser as UserCircle, Users, ChevronDown, Save } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import type { Project, ProjectStatus } from '@/types';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useProjectTasks, isOverdue, type ProjectTask } from '@/hooks/useProjectTasks';
import { useEmployees } from '@/hooks/useEmployees';
import { formatCurrency, todayISO } from '@/utils/calculations';
import { useToast } from '@/context/ToastContext';

interface ProjectTaskModalProps {
  project: Project | null;
  onClose: () => void;
}

const STATUSES: ProjectStatus[] = ['Not Started', 'In Progress', 'In Review', 'Completed'];

export function ProjectTaskModal({ project, onClose }: ProjectTaskModalProps) {
  const { db, updateProject } = useWorkspace();
  const { getProjectTasks, addTask, toggleTask, deleteTask, updateTask } = useProjectTasks();
  const { showToast } = useToast();
  const { employees: allEmployees } = useEmployees();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [assignedToId, setAssignedToId] = useState('');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const teamRef = useRef<HTMLDivElement>(null);

  const [localAssignedMemberIds, setLocalAssignedMemberIds] = useState<string[]>([]);
  const [localStatus, setLocalStatus] = useState<ProjectStatus>('Not Started');

  const employees = allEmployees.filter((e) => e.status === 'Active');

  useEffect(() => {
    if (project) {
      setLocalAssignedMemberIds(project.assignedMemberIds ?? []);
      setLocalStatus(project.status);
    }
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const handler = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [project]);

  if (!project) return null;

  const client = db.clients.find((c) => c.id === project.clientId);
  const clientName = client?.name ?? 'Unassigned';
  const tasks = getProjectTasks(project.id);
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const overdueCount = tasks.filter(isOverdue).length;

  const assignedNames = employees
    .filter((e) => localAssignedMemberIds.includes(e.id))
    .map((e) => e.name);

  const toggleTeamMember = (id: string) => {
    setLocalAssignedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    updateProject(project.id, {
      assignedMemberIds: localAssignedMemberIds,
      status: localStatus,
    });
    showToast('Project updated successfully');
    onClose();
  };

  const handleAdd = () => {
    if (!title.trim() || !dueDate) return;
    const emp = employees.find((e) => e.id === assignedToId);
    addTask({
      projectId: project.id,
      projectName: project.name,
      clientName,
      title,
      dueDate,
      assignedToId: assignedToId || undefined,
      assignedToName: emp?.name,
    });
    setTitle('');
    setDueDate(todayISO());
    setAssignedToId('');
  };

  const handleAssignTask = (taskId: string, empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    updateTask(taskId, {
      assignedToId: empId || undefined,
      assignedToName: emp?.name,
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{project.name}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{clientName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Budget</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(project.budget)}</p>
              </div>
              <select
                value={localStatus}
                onChange={(e) => setLocalStatus(e.target.value as ProjectStatus)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close">
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
          </div>

          {/* Team Members Multi-Select */}
          <div className="mt-3 relative" ref={teamRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTeamDropdownOpen((p) => !p); }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="flex items-center gap-2 truncate">
                <Users className="h-4 w-4 text-slate-400" />
                {assignedNames.length === 0 ? (
                  <span className="text-slate-400">Assign team members...</span>
                ) : assignedNames.length <= 2 ? (
                  <span>{assignedNames.join(', ')}</span>
                ) : (
                  <span>{assignedNames.length} members assigned</span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${teamDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {teamDropdownOpen && (
              <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 scrollbar-thin" onClick={(e) => e.stopPropagation()}>
                {employees.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
                    <UserCircle className="h-4 w-4" /> No active employees
                  </div>
                ) : (
                  employees.map((emp) => {
                    const selected = localAssignedMemberIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleTeamMember(emp.id)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selected ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                          {selected && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 text-slate-700 dark:text-slate-300">{emp.name}</span>
                        <span className="text-xs text-slate-400">{emp.category}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Task Progress</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{completedCount}/{tasks.length} ({progressPct}%)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {overdueCount > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">{overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Add Task Form */}
        <div className="shrink-0 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
              placeholder="Task title..."
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {sortedTasks.length > 0 ? (
            <div className="space-y-2">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onAssign={handleAssignTask}
                  employees={employees}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckSquare className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No tasks yet</p>
              <p className="mt-1 text-sm text-slate-400">Add a task above to start tracking progress.</p>
            </div>
          )}
        </div>

        {/* Footer — Save Changes */}
        <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-[#9f0f0f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#850c0c]"
          >
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onAssign,
  employees,
}: {
  task: ProjectTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAssign: (taskId: string, empId: string) => void;
  employees: Employee[];
}) {
  const overdue = isOverdue(task);
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${task.completed ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'}`}>
      <button
        onClick={() => onToggle(task.id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${task.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'}`}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${task.completed ? 'text-slate-400 line-through dark:text-slate-500' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
          {task.title}
        </p>
      </div>
      {/* Inline assignee selector — visible dropdown */}
      <select
        value={task.assignedToId ?? ''}
        onChange={(e) => onAssign(task.id, e.target.value)}
        className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        title="Assign task"
      >
        <option value="">Unassigned</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.name}</option>
        ))}
      </select>
      <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
        <CalendarClock className="h-3 w-3" />
        {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
