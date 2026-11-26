import { THEME_PREFERENCES, type ThemeName, type ThemePreference } from "./tokens";

export const THEME_STORAGE_KEY = "sp-theme";
/** Light first: the app opens light until someone picks dark or "system". */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

/** Reads a stored preference, falling back to the default for anything unrecognised. */
export function parseThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === value) ?? DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ThemeName {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
