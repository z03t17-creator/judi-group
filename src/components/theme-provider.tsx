"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DENSITY_COOKIE,
  DENSITY_STORAGE_KEY,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  isDensityPreference,
  isThemePreference,
  resolveTheme,
  type DensityPreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  density: DensityPreference;
  setTheme: (theme: ThemePreference) => void;
  setDensity: (density: DensityPreference) => void;
  /** Cycle light → dark → system (chrome control). */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function persistCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function persistTheme(theme: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  persistCookie(THEME_COOKIE, theme);
}

function persistDensity(density: DensityPreference) {
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    /* ignore */
  }
  persistCookie(DENSITY_COOKIE, density);
}

function applyResolved(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function applyDensity(density: DensityPreference) {
  document.documentElement.dataset.density = density;
}

function subscribeSystemDark(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSystemDarkSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSystemDarkSnapshot() {
  return false;
}

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: ThemePreference;
  initialDensity?: DensityPreference;
};

export function ThemeProvider({
  children,
  initialTheme = "system",
  initialDensity = "comfortable",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const [density, setDensityState] = useState<DensityPreference>(initialDensity);
  const [hydrated, setHydrated] = useState(false);
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    getServerSystemDarkSnapshot,
  );
  const resolvedTheme = resolveTheme(theme, systemDark);

  useEffect(() => {
    if (!hydrated) return;
    applyResolved(resolvedTheme);
  }, [hydrated, resolvedTheme]);

  useEffect(() => {
    if (!hydrated) return;
    applyDensity(density);
  }, [hydrated, density]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    persistTheme(next);
    applyResolved(
      resolveTheme(
        next,
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      ),
    );
  }, []);

  const setDensity = useCallback((next: DensityPreference) => {
    setDensityState(next);
    persistDensity(next);
    applyDensity(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemePreference =
        current === "light" ? "dark" : current === "dark" ? "system" : "light";
      persistTheme(next);
      applyResolved(
        resolveTheme(
          next,
          window.matchMedia("(prefers-color-scheme: dark)").matches,
        ),
      );
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(storedTheme) && storedTheme !== theme) {
        setThemeState(storedTheme);
      }
      const storedDensity = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (isDensityPreference(storedDensity) && storedDensity !== density) {
        setDensityState(storedDensity);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      density,
      setTheme,
      setDensity,
      toggleTheme,
    }),
    [theme, resolvedTheme, density, setTheme, setDensity, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
