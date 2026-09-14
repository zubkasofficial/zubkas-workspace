import { useCallback, useEffect, useState } from 'react';
import type { Employee } from '@/types';

const EMPLOYEES_KEY = 'zubkas_employees_data';
const EMPLOYEES_EVENT = 'zubkas_employees_updated';

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Employee[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EMPLOYEES_EVENT));
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);

  useEffect(() => {
    const handler = () => setEmployees(loadEmployees());
    window.addEventListener(EMPLOYEES_EVENT, handler);
    return () => window.removeEventListener(EMPLOYEES_EVENT, handler);
  }, []);

  const addEmployee = useCallback((employee: Employee) => {
    setEmployees((prev) => {
      const next = [...prev, employee];
      saveEmployees(next);
      return next;
    });
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveEmployees(next);
      return next;
    });
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEmployees(next);
      return next;
    });
  }, []);

  return { employees, addEmployee, updateEmployee, deleteEmployee };
}
