import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface ThemeState {
  mode: 'light' | 'dark';
  accent: string;
}

interface ThemeContextValue {
  theme: ThemeState;
  setMode: (mode: 'light' | 'dark') => void;
  setAccent: (accent: string) => void;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'zubkas_theme_color';

const DEFAULT_THEME: ThemeState = { mode: 'light', accent: '#9f0f0f' };

function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ThemeState;
      return { mode: parsed.mode ?? 'light', accent: parsed.accent ?? '#9f0f0f' };
    }
  } catch { /* ignore */ }
  return DEFAULT_THEME;
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

export function applyAccentColor(hex: string) {
  const palette = generatePalette(hex);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(loadTheme);

  useEffect(() => {
    applyAccentColor(theme.accent);
    if (theme.mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme.accent, theme.mode]);

  const setMode = useCallback((mode: 'light' | 'dark') => {
    setTheme((prev) => ({ ...prev, mode }));
  }, []);

  const setAccent = useCallback((accent: string) => {
    setTheme((prev) => ({ ...prev, accent }));
  }, []);

  const applyTheme = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch { /* ignore */ }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setMode, setAccent, applyTheme }}>
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
