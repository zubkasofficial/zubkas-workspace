import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useEmployees } from '@/hooks/useEmployees';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface ProjectTask {
  id: string;
  project_id: string | null;
  project_name: string;
  client_name: string;
  title: string;
  due_date: string;
  completed: boolean;
  created_at: string;
  priority?: TaskPriority;
  description?: string;
  assignedToId?: string;
  assignedToName?: string;
  status?: TaskStatus;
  is_temporary?: boolean;
}

export const TASKS_UPDATED_EVENT = 'zubkas_project_tasks_updated';
const TABLE = 'tasks';

function rowToTask(r: Record<string, unknown>): ProjectTask {
  const status = (r.status as TaskStatus) ?? 'pending';
  return {
    id: r.id,
    project_id: (r.project_id as string | null) ?? null,
    project_name: '',
    client_name: '',
    title: r.title ?? '',
    due_date: r.due_date ?? '',
    completed: status === 'completed',
    created_at: r.created_at ?? '',
    priority: r.priority as TaskPriority | undefined,
    description: r.description as string | undefined,
    assignedToId: (r.assigned_to as string | undefined) ?? undefined,
    assignedToName: undefined,
    status,
    is_temporary: (r.is_temporary as boolean) ?? false,
  };
}

function taskToRow(t: ProjectTask) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    project_id: t.project_id,
    assigned_to: t.assignedToId ?? null,
    priority: t.priority ?? 'medium',
    status: t.status ?? (t.completed ? 'completed' : 'pending'),
    due_date: t.due_date,
    is_temporary: t.is_temporary ?? false,
    updated_at: new Date().toISOString(),
  };
}

export function useProjectTasks() {
  const { db } = useWorkspace();
  const { employees } = useEmployees();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  const enrichTasks = useCallback((raw: ProjectTask[]): ProjectTask[] => {
    return raw.map((t) => {
      const project = t.project_id ? db.projects.find((p) => p.id === t.project_id) : null;
      const client = project ? db.clients.find((c) => c.id === project.clientId) : null;
      const employee = t.assignedToId ? employees.find((e) => e.id === t.assignedToId) : null;
      return {
        ...t,
        project_name: project?.name ?? (t.is_temporary ? '' : (t.project_name ?? '')),
        client_name: client?.name ?? (t.is_temporary ? 'Ad-hoc Task' : (t.client_name ?? 'Unassigned')),
        assignedToName: employee?.name ?? t.assignedToName,
      };
    });
  }, [db.projects, db.clients, employees]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from(TABLE).select('*');
      if (cancelled) return;
      if (error) { setLoaded(true); return; }
      setTasks(enrichTasks((data ?? []).map(rowToTask)));
      setLoaded(true);
    })();

    const handler = () => {
      supabase.from(TABLE).select('*').then(({ data }) => {
        setTasks(enrichTasks((data ?? []).map(rowToTask)));
      });
    };
    window.addEventListener(TASKS_UPDATED_EVENT, handler);
    return () => { cancelled = true; window.removeEventListener(TASKS_UPDATED_EVENT, handler); };
  }, [enrichTasks]);

  const getProjectTasks = useCallback(
    (projectId: string) => tasks.filter((t) => t.project_id === projectId),
    [tasks],
  );

  const addTask = useCallback((input: {
    projectId: string | null; projectName: string; clientName: string; title: string; dueDate: string;
    priority?: TaskPriority; description?: string; assignedToId?: string; assignedToName?: string;
    isTemporary?: boolean;
  }) => {
    const now = new Date().toISOString();
    const task: ProjectTask = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      project_name: input.projectName,
      client_name: input.clientName,
      title: input.title.trim(),
      due_date: input.dueDate,
      completed: false,
      created_at: now,
      priority: input.priority ?? 'medium',
      description: input.description ?? '',
      assignedToId: input.assignedToId,
      assignedToName: input.assignedToName,
      status: 'pending',
      is_temporary: input.isTemporary ?? false,
    };
    setTasks((prev) => {
      const next = [...prev, task];
      supabase.from(TABLE).insert({ ...taskToRow(task), created_at: now }).then(({ error }) => {
        if (error) console.error('insert task:', error.message);
        else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      });
      return next;
    });
    return task;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<ProjectTask, 'id' | 'created_at'>>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      const updated = next.find((t) => t.id === taskId);
      if (updated) supabase.from(TABLE).update(taskToRow(updated)).eq('id', taskId).then(({ error }) => { if (error) console.error('update task:', error.message); else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT)); });
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== taskId) return t;
        const completed = !t.completed;
        return { ...t, completed, status: (completed ? 'completed' : 'pending') as TaskStatus };
      });
      const updated = next.find((t) => t.id === taskId);
      if (updated) supabase.from(TABLE).update(taskToRow(updated)).eq('id', taskId).then(({ error }) => { if (error) console.error('update task:', error.message); else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT)); });
      return next;
    });
  }, []);

  const setTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, completed: status === 'completed', status };
      });
      const updated = next.find((t) => t.id === taskId);
      if (updated) supabase.from(TABLE).update({ status, updated_at: new Date().toISOString() }).eq('id', taskId).then(({ error }) => { if (error) console.error('update task status:', error.message); else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT)); });
      return next;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      supabase.from(TABLE).delete().eq('id', taskId).then(({ error }) => { if (error) console.error('delete task:', error.message); else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT)); });
      return next;
    });
  }, []);

  const deleteProjectTasks = useCallback((projectId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.project_id !== projectId);
      supabase.from(TABLE).delete().eq('project_id', projectId).then(({ error }) => { if (error) console.error('delete project tasks:', error.message); else window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT)); });
      return next;
    });
  }, []);

  return { tasks, getProjectTasks, addTask, updateTask, toggleTask, setTaskStatus, deleteTask, deleteProjectTasks, loaded };
}

function isCompleted(task: ProjectTask): boolean {
  return task.completed || task.status === 'completed';
}

export function isOverdue(task: ProjectTask): boolean {
  if (isCompleted(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due < today;
}

export function isDueToday(task: ProjectTask): boolean {
  if (isCompleted(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due.getTime() === today.getTime();
}

export function isUpcoming(task: ProjectTask): boolean {
  if (isCompleted(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);
  return due > today && due <= sevenDays;
}
