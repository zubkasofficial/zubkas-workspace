import { useCallback, useEffect, useState } from 'react';
import type { Employee } from '@/types';
import { supabase } from '@/lib/supabase';

const EMPLOYEES_EVENT = 'zubkas_employees_updated';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('employees').select('*');
      if (error) { setLoaded(true); return; }
      setEmployees((data ?? []).map((r) => ({
        id: r.id, name: r.name, email: r.email, password: r.password, category: r.category,
        phone: r.phone, status: r.status, permissions: r.permissions ?? {}, created_at: r.created_at,
      })));
      setLoaded(true);
    })();

    const handler = () => {
      supabase.from('employees').select('*').then(({ data }) => {
        setEmployees((data ?? []).map((r) => ({
          id: r.id, name: r.name, email: r.email, password: r.password, category: r.category,
          phone: r.phone, status: r.status, permissions: r.permissions ?? {}, created_at: r.created_at,
        })));
      });
    };
    window.addEventListener(EMPLOYEES_EVENT, handler);
    return () => window.removeEventListener(EMPLOYEES_EVENT, handler);
  }, []);

  const persistAll = (next: Employee[]) => {
    supabase.from('employees').upsert(next.map((e) => ({
      id: e.id, name: e.name, email: e.email, password: e.password, category: e.category,
      phone: e.phone, status: e.status, permissions: e.permissions, created_at: e.created_at,
    }))).then(({ error }) => { if (error) console.error('upsert employees:', error.message); });
    window.dispatchEvent(new CustomEvent(EMPLOYEES_EVENT));
  };

  const addEmployee = useCallback((employee: Employee) => {
    setEmployees((prev) => {
      const next = [...prev, employee];
      persistAll(next);
      return next;
    });
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      persistAll(next);
      return next;
    });
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      supabase.from('employees').delete().eq('id', id).then(({ error }) => { if (error) console.error('delete employee:', error.message); });
      window.dispatchEvent(new CustomEvent(EMPLOYEES_EVENT));
      return next;
    });
  }, []);

  return { employees, addEmployee, updateEmployee, deleteEmployee, loaded };
}
