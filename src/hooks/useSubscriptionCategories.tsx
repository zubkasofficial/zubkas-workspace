import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const SUB_CATEGORIES_EVENT = 'sub_categories_updated';

let sharedCategories: string[] = [];
let sharedLoaded = false;
let fetchPromise: Promise<void> | null = null;

async function fetchFromSupabase(): Promise<void> {
  const { data, error } = await supabase
    .from('subscription_categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[subscription_categories] fetch failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of data ?? []) {
    const key = (row.name ?? '').toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      names.push(row.name);
    }
  }
  sharedCategories = names;
  sharedLoaded = true;
  window.dispatchEvent(new CustomEvent(SUB_CATEGORIES_EVENT));
}

function ensureFetched(): Promise<void> {
  if (!fetchPromise) {
    fetchPromise = fetchFromSupabase().finally(() => { fetchPromise = null; });
  }
  return fetchPromise;
}

export function useSubscriptionCategories() {
  const [categories, setCategories] = useState<string[]>(sharedCategories);
  const [loaded, setLoaded] = useState(sharedLoaded);

  useEffect(() => {
    if (!sharedLoaded) {
      ensureFetched();
    }
    setCategories(sharedCategories);
    setLoaded(sharedLoaded);

    const handler = () => {
      setCategories(sharedCategories);
      setLoaded(sharedLoaded);
    };
    window.addEventListener(SUB_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(SUB_CATEGORIES_EVENT, handler);
  }, []);

  const addCategory = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (sharedCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;

    const { error } = await supabase
      .from('subscription_categories')
      .insert([{ name: trimmed }]);

    if (error) {
      console.error('[subscription_categories] insert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        name: trimmed,
      });
      return false;
    }

    await fetchFromSupabase();
    return true;
  }, []);

  const updateCategory = useCallback(async (oldName: string, newName: string): Promise<boolean> => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const { error } = await supabase
      .from('subscription_categories')
      .update({ name: trimmed })
      .eq('name', oldName);

    if (error) {
      console.error('[subscription_categories] update failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        oldName,
        newName: trimmed,
      });
      return false;
    }

    await fetchFromSupabase();
    return true;
  }, []);

  const removeCategory = useCallback(async (name: string): Promise<boolean> => {
    const { error } = await supabase
      .from('subscription_categories')
      .delete()
      .eq('name', name);

    if (error) {
      console.error('[subscription_categories] delete failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        name,
      });
      return false;
    }

    await fetchFromSupabase();
    return true;
  }, []);

  return { categories, addCategory, updateCategory, removeCategory, loaded };
}
