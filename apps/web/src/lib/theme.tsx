"use client";

import { resolveTheme, type ThemeName, type ThemePreference } from "@skillprove/shared/design";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { PREFERENCE_COOKIES, writePreferenceCookie } from "./preferences";

interface ThemeValue {
  preference: ThemePreference;
  /** The theme actually shown. */
  theme: ThemeName;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

/**
 * The server already set data-theme on <html> from the cookie, and CSS handles "system", so
 * nothing flashes. This provider only changes it later and reports the shown theme.
 */
export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
  const [preference, setPreferenceState] = useState(initialPreference);
  const prefersDark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);

  const setPreference = useCallback((next: ThemePreference) => {
    writePreferenceCookie(PREFERENCE_COOKIES.theme, next);
    document.documentElement.dataset.theme = next;
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, theme: resolveTheme(preference, prefersDark), setPreference }),
    [preference, prefersDark, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
