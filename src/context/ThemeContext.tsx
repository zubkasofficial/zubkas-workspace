import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppearanceMode = 'light' | 'dark';

export interface ThemeState {
  mode: AppearanceMode;
  accent: string;
}

interface ThemeContextValue {
  theme: ThemeState;
  setMode: (mode: AppearanceMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_STORAGE_KEY = 'zubkas_appearance_mode';

export const BRAND_ACCENT = '#9f0f0f';

function loadMode(): AppearanceMode {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return [r, g, b];
}

function mix(hex: string, target: [number, number, number], weight: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r * (1 - weight) + target[0] * weight),
    Math.round(g * (1 - weight) + target[1] * weight),
    Math.round(b * (1 - weight) + target[2] * weight),
  ];
}

function generatePalette(baseHex: string): Record<string, string> {
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  const shades: Record<string, string> = {};
  const steps: { key: string; target: [number, number, number]; weight: number }[] = [
    { key: '50', target: white, weight: 0.95 },
    { key: '100', target: white, weight: 0.88 },
    { key: '200', target: white, weight: 0.75 },
    { key: '300', target: white, weight: 0.55 },
    { key: '400', target: white, weight: 0.25 },
    { key: '500', target: white, weight: 0.0 },
    { key: '600', target: black, weight: 0.10 },
    { key: '700', target: black, weight: 0.25 },
    { key: '800', target: black, weight: 0.40 },
    { key: '900', target: black, weight: 0.55 },
  ];
  for (const step of steps) {
    const [r, g, b] = mix(baseHex, step.target, step.weight);
    shades[`--brand-${step.key}`] = `${r} ${g} ${b}`;
  }
  return shades;
}

function applyBrandPalette() {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(generatePalette(BRAND_ACCENT))) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(loadMode);

  useEffect(() => {
    applyBrandPalette();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const setMode = useCallback((next: AppearanceMode) => {
    setModeState(next);
    try { localStorage.setItem(MODE_STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: { mode, accent: BRAND_ACCENT }, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
