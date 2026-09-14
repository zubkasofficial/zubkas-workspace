import { CalendarDays, ChevronDown, SquareCheck as CheckSquare, Plus, TriangleAlert as AlertTriangle, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency } from '@/utils/calculations';
import { ProjectModal } from '@/components/ProjectModal';
import { ProjectTaskModal } from '@/components/ProjectTaskModal';
import { useProjectTasks, isOverdue } from '@/hooks/useProjectTasks';
import { useAuth } from '@/context/AuthContext';
import type { Employee, Project, ProjectStatus } from '@/types';

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem('zubkas_employees_data');
    if (raw) {
      const parsed = JSON.parse(raw) as Employee[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

const columns: { status: ProjectStatus; color: string }[] = [
  { status: 'Not Started', color: 'bg-slate-400' },
  { status: 'In Progress', color: 'bg-blue-500' },
  { status: 'In Review', color: 'bg-purple-500' },
  { status: 'Completed', color: 'bg-emerald-500' },
];

export function Projects() {
  const { db, updateProjectStatus } = useWorkspace();
  const { tasks, getProjectTasks } = useProjectTasks();
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const allEmployees = loadEmployees();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const visibleProjects = useMemo(() => {
    if (!isEmployee || !user) return db.projects;
    return db.projects.filter((p) => {
      if (p.assignedMemberIds?.includes(user.employeeId ?? '')) return true;
      if (tasks.some((t) => t.project_id === p.id && t.assignedToId === user.employeeId)) return true;
      return false;
    });
  }, [db.projects, isEmployee, user, tasks]);

  const openTaskModal = (project: Project) => {
    setSelectedProject(project);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Projects Kanban</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Projects are automatically created when an invoice receives payment</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const projects = visibleProjects.filter((project) => project.status === column.status);
          return (
            <div key={column.status} className="min-h-[360px] rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-900/70">
              <div className="mb-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{column.status}</h4>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800">{projects.length}</span>
              </div>
              <div className="space-y-3">
                {projects.map((project) => {
                  const tasks = getProjectTasks(project.id);
                  const completedTasks = tasks.filter((t) => t.completed).length;
                  const overdueTasks = tasks.filter(isOverdue).length;
                  return (
                    <div
                      key={project.id}
                      onClick={() => openTaskModal(project)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
                    >
                      <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{project.name}</h5>
                      <p className="mt-1 text-xs text-slate-500">{db.clients.find((client) => client.id === project.clientId)?.name ?? 'Unassigned'}</p>
                      {project.description && <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{project.description}</p>}
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-IN') : 'No deadline'}</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(project.budget)}</span>
                      </div>

                      {/* Team Members */}
                      {project.assignedMemberIds && project.assignedMemberIds.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <div className="flex -space-x-1.5">
                            {project.assignedMemberIds.slice(0, 4).map((memberId) => {
                              const emp = allEmployees.find((e) => e.id === memberId);
                              return (
                                <div key={memberId} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-600/10 text-[10px] font-bold text-brand-600 dark:border-slate-900 dark:bg-brand-600/20 dark:text-brand-400" title={emp?.name ?? 'Unknown'}>
                                  {emp?.name?.charAt(0).toUpperCase() ?? '?'}
                                </div>
                              );
                            })}
                          </div>
                          {project.assignedMemberIds.length > 4 && (
                            <span className="text-xs font-medium text-slate-400">+{project.assignedMemberIds.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Task Progress Pill */}
                      {tasks.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                            <CheckSquare className="h-3 w-3" /> {completedTasks}/{tasks.length} Tasks
                          </span>
                          {overdueTasks > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                              <AlertTriangle className="h-3 w-3" /> {overdueTasks} Overdue
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <select value={project.status} onChange={(event) => updateProjectStatus(project.id, event.target.value as ProjectStatus)} className="flex w-full items-center justify-between bg-transparent text-xs font-semibold text-slate-500 outline-none dark:text-slate-400">
                          <option>Not Started</option>
                          <option>In Progress</option>
                          <option>In Review</option>
                          <option>Completed</option>
                        </select>
                        <ChevronDown className="pointer-events-none relative float-right -mt-4 mr-1 h-3 w-3 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                    <p className="text-xs text-slate-400">No projects</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ProjectTaskModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
