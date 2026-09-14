import { useCallback, useEffect, useState } from 'react';

export const EMP_CATEGORIES_KEY = 'zubkas_employee_categories';
export const EMP_CATEGORIES_EVENT = 'emp_categories_updated';

const DEFAULT_CATEGORIES = [
  'Management',
  'Sales & Billing',
  'Operations',
  'Development',
  'Accounts',
];

function loadCategories(): string[] {
  try {
    const raw = localStorage.getItem(EMP_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  try {
    localStorage.setItem(EMP_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  } catch { /* ignore */ }
  return [...DEFAULT_CATEGORIES];
}

function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(EMP_CATEGORIES_KEY, JSON.stringify(categories));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EMP_CATEGORIES_EVENT));
}

export function useEmployeeCategories() {
  const [categories, setCategories] = useState<string[]>(loadCategories);

  useEffect(() => {
    const handler = () => setCategories(loadCategories());
    window.addEventListener(EMP_CATEGORIES_EVENT, handler);
    return () => window.removeEventListener(EMP_CATEGORIES_EVENT, handler);
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

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c !== name);
      saveCategories(next);
      return next;
    });
  }, []);

  return { categories, addCategory, removeCategory };
}
