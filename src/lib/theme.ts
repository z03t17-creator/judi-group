export const THEME_COOKIE = "judi-theme";
export const THEME_STORAGE_KEY = "judi-theme";
export const DENSITY_COOKIE = "judi-density";
export const DENSITY_STORAGE_KEY = "judi-density";

export const THEME_VALUES = ["light", "dark", "system"] as const;
export const DENSITY_VALUES = ["comfortable", "compact"] as const;

export type ThemePreference = (typeof THEME_VALUES)[number];
export type ResolvedTheme = "light" | "dark";
export type DensityPreference = (typeof DENSITY_VALUES)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_VALUES as readonly string[]).includes(value)
  );
}

export function isDensityPreference(value: unknown): value is DensityPreference {
  return (
    typeof value === "string" &&
    (DENSITY_VALUES as readonly string[]).includes(value)
  );
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemDark ? "dark" : "light";
  }
  return preference;
}

/** Inline script — runs before paint to avoid a white flash. */
export const themeInitScript = `(function(){try{var tk=${JSON.stringify(THEME_STORAGE_KEY)};var tc=${JSON.stringify(THEME_COOKIE)};var tm=document.cookie.match(new RegExp('(?:^|; )'+tc+'=([^;]*)'));var tv=(tm?decodeURIComponent(tm[1]):null)||localStorage.getItem(tk)||'system';if(tv!=='light'&&tv!=='dark'&&tv!=='system')tv='system';var dark=tv==='dark'||(tv==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';var dk=${JSON.stringify(DENSITY_STORAGE_KEY)};var dc=${JSON.stringify(DENSITY_COOKIE)};var dm=document.cookie.match(new RegExp('(?:^|; )'+dc+'=([^;]*)'));var dv=(dm?decodeURIComponent(dm[1]):null)||localStorage.getItem(dk)||'comfortable';if(dv!=='comfortable'&&dv!=='compact')dv='comfortable';r.dataset.density=dv;}catch(e){}})();`;
