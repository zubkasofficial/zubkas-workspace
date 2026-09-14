import { useCallback, useEffect, useState } from 'react';

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

export const TASKS_STORAGE_KEY = 'zubkas_project_tasks';
export const TASKS_UPDATED_EVENT = 'zubkas_project_tasks_updated';

function loadTasks(): ProjectTask[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectTask[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveTasks(tasks: ProjectTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
}

interface CreateTaskInput {
  projectId: string;
  projectName: string;
  clientName: string;
  title: string;
  dueDate: string;
  priority?: TaskPriority;
  description?: string;
  assignedToId?: string;
  assignedToName?: string;
}

export function useProjectTasks() {
  const [tasks, setTasks] = useState<ProjectTask[]>(loadTasks);

  useEffect(() => {
    const handler = () => setTasks(loadTasks());
    window.addEventListener(TASKS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TASKS_UPDATED_EVENT, handler);
  }, []);

  const getProjectTasks = useCallback(
    (projectId: string) => tasks.filter((t) => t.project_id === projectId),
    [tasks],
  );

  const addTask = useCallback((input: CreateTaskInput) => {
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
      saveTasks(next);
      return next;
    });
    return task;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Omit<ProjectTask, 'id' | 'created_at'>>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      saveTasks(next);
      return next;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      saveTasks(next);
      return next;
    });
  }, []);

  const deleteProjectTasks = useCallback((projectId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.project_id !== projectId);
      saveTasks(next);
      return next;
    });
  }, []);

  return { tasks, getProjectTasks, addTask, updateTask, toggleTask, deleteTask, deleteProjectTasks };
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
