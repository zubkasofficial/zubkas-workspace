import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const SUB_CATEGORIES_EVENT = 'sub_categories_updated';

const DEFAULT_CATEGORIES = [
  'Web Hosting & Maintenance',
  'Software / SaaS License',
  'Digital Marketing & SEO Retainer',
  'Cloud Infrastructure / VPS',
  'Annual Maintenance Contract (AMC)',
];

export function useSubscriptionCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('subscription_categories').select('*');
      if (error || !data || data.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
        setLoaded(true);
        return;
      }
      setCategories(data.map((r) => r.name));
      setLoaded(true);
    })();

    const handler = () => {
      supabase.from('subscription_categories').select('*').then(({ data }) => {
        setCategories(data && data.length > 0 ? data.map((r) => r.name) : DEFAULT_CATEGORIES);
      });
    };
    window.addEventListener(SUB_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(SUB_CATEGORIES_EVENT, handler);
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
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
      const next = prev.map((c) => c === oldName ? trimmed : c);
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
