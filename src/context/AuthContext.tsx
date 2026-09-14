import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { CurrentUser } from '@/types';

const AUTH_USER_KEY = 'zubkas_auth_user';

interface AuthContextValue {
  user: CurrentUser | null;
  login: (user: CurrentUser, remember: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) return JSON.parse(raw) as CurrentUser;
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(loadUser);

  const login = useCallback((u: CurrentUser, remember: boolean) => {
    setUser(u);
    try {
      if (remember) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      else sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    } catch { /* ignore */ }
  }, []);

  const updateUser = useCallback((updates: Partial<CurrentUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      try {
        const localRaw = localStorage.getItem(AUTH_USER_KEY);
        const sessionRaw = sessionStorage.getItem(AUTH_USER_KEY);
        if (localRaw) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
        if (sessionRaw) sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
