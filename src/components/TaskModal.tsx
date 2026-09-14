import { useEffect, useState } from 'react';
import { SquareCheck as CheckSquare, Save, X } from 'lucide-react';
import type { ProjectTask, TaskPriority } from '@/hooks/useProjectTasks';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useEmployees } from '@/hooks/useEmployees';
import { todayISO } from '@/utils/calculations';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  editingTask?: ProjectTask | null;
  presetProjectId?: string;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'high', label: 'High', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
];

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

export function TaskModal({ open, onClose, editingTask, presetProjectId }: TaskModalProps) {
  const { db } = useWorkspace();
  const { addTask, updateTask } = useProjectTasks();
  const { showToast } = useToast();
  const { employees: allEmployees } = useEmployees();
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const employees = allEmployees.filter((e) => e.status === 'Active');

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setProjectId(editingTask.project_id);
        setTitle(editingTask.title);
        setPriority(editingTask.priority ?? 'medium');
        setDueDate(editingTask.due_date);
        setDescription(editingTask.description ?? '');
        setAssignedToId(editingTask.assignedToId ?? '');
      } else {
        setProjectId(presetProjectId ?? db.projects[0]?.id ?? '');
        setTitle('');
        setPriority('medium');
        setDueDate(todayISO());
        setDescription('');
        setAssignedToId('');
      }
    }
  }, [open, editingTask, presetProjectId, db.projects]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) { showToast('Please select a project', 'error'); return; }
    if (!title.trim()) { showToast('Task title is required', 'error'); return; }
    const project = db.projects.find((p) => p.id === projectId);
    if (!project) { showToast('Selected project not found', 'error'); return; }
    const clientName = db.clients.find((c) => c.id === project.clientId)?.name ?? 'Unassigned';
    const assignedEmployee = employees.find((e) => e.id === assignedToId);
    const assignedToName = assignedEmployee?.name;

    if (editingTask) {
      updateTask(editingTask.id, {
        project_id: projectId, project_name: project.name, client_name: clientName,
        title: title.trim(), due_date: dueDate, priority, description: description.trim(),
        assignedToId: assignedToId || undefined, assignedToName,
      });
      showToast('Task updated successfully');
    } else {
      addTask({
        projectId, projectName: project.name, clientName,
        title: title.trim(), dueDate: dueDate || todayISO(), priority, description: description.trim(),
        assignedToId: assignedToId || undefined, assignedToName,
      });
      showToast('Task created successfully');
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 scrollbar-thin">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label className={labelClass}>Select Project <span className="text-brand-600">*</span></label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass} required>
              {db.projects.length === 0 && <option value="" disabled>No projects yet — create a project first</option>}
              {db.projects.length > 0 && !editingTask && <option value="" disabled>Select a project...</option>}
              {db.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} — {db.clients.find((c) => c.id === project.clientId)?.name ?? 'Unassigned'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Task Title <span className="text-brand-600">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Configure DNS & SSL" className={inputClass} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${priority === p.value ? `${p.color} border-transparent ring-2 ring-brand-500/20` : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Due Date <span className="text-brand-600">*</span></label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div>
            <label className={labelClass}>Assign To</label>
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={inputClass}>
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Description / Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional task details or notes..." className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700">
              <Save className="h-4 w-4" /> {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
