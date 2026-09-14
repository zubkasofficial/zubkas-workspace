import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserCog } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { generateId, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useEmployees } from '@/hooks/useEmployees';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const STATUSES: ProjectStatus[] = ['Not Started', 'In Progress', 'In Review', 'Completed'];

export function ProjectModal({ open, onClose }: ProjectModalProps) {
  const { db, addProject } = useWorkspace();
  const { showToast } = useToast();
  const { employees: allEmployees } = useEmployees();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(db.clients[0]?.id ?? '');
  const [status, setStatus] = useState<ProjectStatus>('Not Started');
  const [budget, setBudget] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  const employees = allEmployees.filter((e) => e.status === 'Active');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleMember = (id: string) => {
    setAssignedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const assignedNames = employees
    .filter((e) => assignedMemberIds.includes(e.id))
    .map((e) => e.name);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !clientId) { showToast('Project name and client are required', 'error'); return; }
    const project: Project = {
      id: generateId('prj'),
      name,
      clientId,
      description: description || 'Manually created project',
      status,
      startDate: todayISO(),
      dueDate,
      budget: Number(budget) || 0,
      assignedMemberIds,
    };
    addProject(project);
    onClose();
    showToast('Project created successfully');
    setName(''); setBudget(''); setDueDate(''); setDescription(''); setAssignedMemberIds([]);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Project Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Client</label>
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
            {db.clients.length === 0 && <option value="" disabled>No clients yet — add a client first</option>}
            {db.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputClass}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Budget (₹)</label>
            <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="relative" ref={assigneeRef}>
          <label className={labelClass}>Assign Team Members</label>
          <button
            type="button"
            onClick={() => setAssigneeDropdownOpen((prev) => !prev)}
            className={`${inputClass} flex items-center justify-between text-left`}
          >
            <span className={`truncate ${assignedNames.length === 0 ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>
              {assignedNames.length === 0
                ? 'Select team members...'
                : assignedNames.length <= 2
                  ? assignedNames.join(', ')
                  : `${assignedNames.length} members assigned`}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${assigneeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {assigneeDropdownOpen && (
            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 scrollbar-thin">
              {employees.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
                  <UserCog className="h-4 w-4" /> No active employees
                </div>
              ) : (
                employees.map((emp) => {
                  const selected = assignedMemberIds.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleMember(emp.id)}
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

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief project description" className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Create Project</button>
        </div>
      </form>
    </Modal>
  );
}
