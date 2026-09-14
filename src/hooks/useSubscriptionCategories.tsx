import { useCallback, useEffect, useState } from 'react';

export const SUB_CATEGORIES_KEY = 'zubkas_sub_categories';
export const SUB_CATEGORIES_EVENT = 'sub_categories_updated';

const DEFAULT_CATEGORIES = [
  'Web Hosting & Maintenance',
  'Software / SaaS License',
  'Digital Marketing & SEO Retainer',
  'Cloud Infrastructure / VPS',
  'Annual Maintenance Contract (AMC)',
];

function loadCategories(): string[] {
  try {
    const raw = localStorage.getItem(SUB_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  try {
    localStorage.setItem(SUB_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  } catch { /* ignore */ }
  return [...DEFAULT_CATEGORIES];
}

function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(SUB_CATEGORIES_KEY, JSON.stringify(categories));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(SUB_CATEGORIES_EVENT));
}

export function useSubscriptionCategories() {
  const [categories, setCategories] = useState<string[]>(loadCategories);

  useEffect(() => {
    const handler = () => setCategories(loadCategories());
    window.addEventListener(SUB_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(SUB_CATEGORIES_EVENT, handler);
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      saveCategories(next);
      return next;
    });
  }, []);

  const updateCategory = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      const next = prev.map((c) => c === oldName ? trimmed : c);
      saveCategories(next);
      return next;
    });
  }, []);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c !== name);
      saveCategories(next);
      return next;
    });
  }, []);

  return { categories, addCategory, updateCategory, removeCategory };
}
