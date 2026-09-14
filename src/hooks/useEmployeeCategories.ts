import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const EMP_CATEGORIES_EVENT = 'emp_categories_updated';

function dedupeByName(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }
  return result;
}

export function useEmployeeCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('employee_categories').select('*');
    if (error) {
      console.error('fetch emp_categories:', error.message);
      return;
    }
    const names = dedupeByName((data ?? []).map((r) => r.name));
    setCategories(names);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchCategories();
      setLoaded(true);
    })();

    const handler = () => { fetchCategories(); };
    window.addEventListener(EMP_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(EMP_CATEGORIES_EVENT, handler);
  }, [fetchCategories]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = dedupeByName([...prev, trimmed]);
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
