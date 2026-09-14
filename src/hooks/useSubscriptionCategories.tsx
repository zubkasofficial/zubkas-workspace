import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const SUB_CATEGORIES_EVENT = 'sub_categories_updated';

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

export function useSubscriptionCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('subscription_categories').select('*');
    if (error) {
      console.error('fetch sub_categories:', error.message);
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
    window.addEventListener(SUB_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(SUB_CATEGORIES_EVENT, handler);
  }, [fetchCategories]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = dedupeByName([...prev, trimmed]);
      supabase.from('subscription_categories').insert({ name: trimmed }).then(({ error }) => {
        if (error) console.error('insert sub_category:', error.message);
      });
      window.dispatchEvent(new CustomEvent(SUB_CATEGORIES_EVENT));
      return next;
    });
  }, []);

  const updateCategory = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      const next = dedupeByName(prev.map((c) => c === oldName ? trimmed : c));
      supabase.from('subscription_categories').update({ name: trimmed }).eq('name', oldName).then(({ error }) => {
        if (error) console.error('update sub_category:', error.message);
      });
      window.dispatchEvent(new CustomEvent(SUB_CATEGORIES_EVENT));
      return next;
    });
  }, []);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c !== name);
      supabase.from('subscription_categories').delete().eq('name', name).then(({ error }) => {
        if (error) console.error('delete sub_category:', error.message);
      });
      window.dispatchEvent(new CustomEvent(SUB_CATEGORIES_EVENT));
      return next;
    });
  }, []);

  return { categories, addCategory, updateCategory, removeCategory, loaded };
}
