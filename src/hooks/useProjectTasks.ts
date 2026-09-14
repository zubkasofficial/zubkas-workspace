import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface ProjectTask {
  id: string;
  project_id: string;
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
}

export const TASKS_UPDATED_EVENT = 'zubkas_project_tasks_updated';

function rowToTask(r: Record<string, unknown>): ProjectTask {
  return {
    id: r.id, project_id: r.project_id, project_name: r.project_name, client_name: r.client_name,
    title: r.title, due_date: r.due_date, completed: r.completed, created_at: r.created_at,
    priority: r.priority, description: r.description, assignedToId: r.assigned_to_id, assignedToName: r.assigned_to_name,
  };
}
function taskToRow(t: ProjectTask) {
  return {
    id: t.id, project_id: t.project_id, project_name: t.project_name, client_name: t.client_name,
    title: t.title, due_date: t.due_date, completed: t.completed, created_at: t.created_at,
    priority: t.priority, description: t.description, assigned_to_id: t.assignedToId, assigned_to_name: t.assignedToName,
  };
}

export function useProjectTasks() {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('project_tasks').select('*');
      if (error) { setLoaded(true); return; }
      setTasks((data ?? []).map(rowToTask));
      setLoaded(true);
    })();

    const handler = () => {
      supabase.from('project_tasks').select('*').then(({ data }) => {
        setTasks((data ?? []).map(rowToTask));
      });
    };
    window.addEventListener(TASKS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TASKS_UPDATED_EVENT, handler);
  }, []);

  const getProjectTasks = useCallback(
    (projectId: string) => tasks.filter((t) => t.project_id === projectId),
    [tasks],
  );

  const addTask = useCallback((input: {
    projectId: string; projectName: string; clientName: string; title: string; dueDate: string;
    priority?: TaskPriority; description?: string; assignedToId?: string; assignedToName?: string;
  }) => {
    const task: ProjectTask = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      project_name: input.projectName,
      client_name: input.clientName,
      title: input.title.trim(),
      due_date: input.dueDate,
      completed: false,
      created_at: new Date().toISOString(),
      priority: input.priority ?? 'medium',
      description: input.description ?? '',
      assignedToId: input.assignedToId,
      assignedToName: input.assignedToName,
    };
    setTasks((prev) => {
      const next = [...prev, task];
      supabase.from('project_tasks').upsert(taskToRow(task)).then(({ error }) => {
        if (error) console.error('upsert task:', error.message);
      });
      window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      return next;
    });
    return task;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<ProjectTask, 'id' | 'created_at'>>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      const updated = next.find((t) => t.id === taskId);
      if (updated) supabase.from('project_tasks').upsert(taskToRow(updated)).then(({ error }) => { if (error) console.error('upsert task:', error.message); });
      window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      const updated = next.find((t) => t.id === taskId);
      if (updated) supabase.from('project_tasks').upsert(taskToRow(updated)).then(({ error }) => { if (error) console.error('upsert task:', error.message); });
      window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      return next;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      supabase.from('project_tasks').delete().eq('id', taskId).then(({ error }) => { if (error) console.error('delete task:', error.message); });
      window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      return next;
    });
  }, []);

  const deleteProjectTasks = useCallback((projectId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.project_id !== projectId);
      supabase.from('project_tasks').delete().eq('project_id', projectId).then(({ error }) => { if (error) console.error('delete project tasks:', error.message); });
      window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
      return next;
    });
  }, []);

  return { tasks, getProjectTasks, addTask, updateTask, toggleTask, deleteTask, deleteProjectTasks, loaded };
}

export function isOverdue(task: ProjectTask): boolean {
  if (task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due < today;
}

export function isDueToday(task: ProjectTask): boolean {
  if (task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  return due.getTime() === today.getTime();
}

export function isUpcoming(task: ProjectTask): boolean {
  if (task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);
  return due > today && due <= sevenDays;
}
