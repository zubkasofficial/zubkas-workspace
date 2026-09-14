import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const EMP_CATEGORIES_EVENT = 'emp_categories_updated';

const DEFAULT_CATEGORIES = [
  'Management',
  'Sales & Billing',
  'Operations',
  'Development',
  'Accounts',
];

export function useEmployeeCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('employee_categories').select('*');
      if (error || !data || data.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
        setLoaded(true);
        return;
      }
      setCategories(data.map((r) => r.name));
      setLoaded(true);
    })();

    const handler = () => {
      supabase.from('employee_categories').select('*').then(({ data }) => {
        setCategories(data && data.length > 0 ? data.map((r) => r.name) : DEFAULT_CATEGORIES);
      });
    };
    window.addEventListener(EMP_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(EMP_CATEGORIES_EVENT, handler);
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      supabase.from('employee_categories').insert({ name: trimmed }).then(({ error }) => {
        if (error) console.error('insert emp_category:', error.message);
      });
      window.dispatchEvent(new CustomEvent(EMP_CATEGORIES_EVENT));
      return next;
    });
  }, []);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c !== name);
      supabase.from('employee_categories').delete().eq('name', name).then(({ error }) => {
        if (error) console.error('delete emp_category:', error.message);
      });
      window.dispatchEvent(new CustomEvent(EMP_CATEGORIES_EVENT));
      return next;
    });
  }, []);

  return { categories, addCategory, removeCategory, loaded };
}
