import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  accentColor: string;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  setAccentColor: (c: string) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const ACCENT_VAR_MAP: Record<string, string> = {
  '#00a884': '#00a884',
  '#2563eb': '#2563eb',
  '#0ea5e9': '#0ea5e9',
  '#e11d48': '#e11d48',
  '#f59e0b': '#f59e0b',
  '#10b981': '#10b981',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme-mode') as ThemeMode) || 'system';
  });
  const [accentColor, setAccentColorState] = useState<string>(
    () => localStorage.getItem('accent-color') || '#00a884'
  );
  const [loading, setLoading] = useState(false);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = mode === 'system' ? systemDark : mode === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENT_VAR_MAP[accentColor] || accentColor;
    root.style.setProperty('--accent', accent);
    localStorage.setItem('accent-color', accentColor);
  }, [accentColor]);

  const persistSettings = useCallback(
    async (nextMode: ThemeMode, nextAccent: string) => {
      if (!user) return;
      setLoading(true);
      const payload: Partial<UserSettings> = {
        theme: nextMode,
        accent_color: nextAccent,
      };
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...payload })
        .eq('user_id', user.id);
      setLoading(false);
    },
    [user]
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem('theme-mode', m);
      persistSettings(m, accentColor);
    },
    [accentColor, persistSettings]
  );

  const setAccentColor = useCallback(
    (c: string) => {
      setAccentColorState(c);
      persistSettings(mode, c);
    },
    [mode, persistSettings]
  );

  // Load persisted settings from DB once signed in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const s = data as UserSettings;
      setModeState(s.theme);
      localStorage.setItem('theme-mode', s.theme);
      if (s.accent_color) {
        setAccentColorState(s.accent_color);
        localStorage.setItem('accent-color', s.accent_color);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <ThemeContext.Provider
      value={{ mode, accentColor, isDark, setMode, setAccentColor, loading }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
