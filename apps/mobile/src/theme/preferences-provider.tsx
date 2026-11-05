import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ColorTokens,
  type ThemeName,
  type ThemePreference,
} from "@skillprove/shared/design";
import { createTranslator, LOCALE_STORAGE_KEY, parseLocale, type Locale, type Translate } from "@skillprove/shared/i18n";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { readPreference, writePreference } from "../lib/preference-store";
import { paletteFor } from "./styles";

interface PreferencesValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** The theme actually shown. */
  theme: ThemeName;
  colors: ColorTokens;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

/**
 * Theme and language for the whole app, loaded from storage before the first screen renders,
 * so nothing flashes from the default to the saved choice.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [loaded, setLoaded] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(parseLocale(null));
  const [preference, setPreferenceState] = useState<ThemePreference>(parseThemePreference(null));

  useEffect(() => {
    let active = true;
    void Promise.all([readPreference(LOCALE_STORAGE_KEY), readPreference(THEME_STORAGE_KEY)]).then(([storedLocale, storedTheme]) => {
      if (!active) return;
      setLocaleState(parseLocale(storedLocale));
      setPreferenceState(parseThemePreference(storedTheme));
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void writePreference(LOCALE_STORAGE_KEY, next);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writePreference(THEME_STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => {
    const theme = resolveTheme(preference, systemScheme === "dark");
    return { locale, setLocale, t: createTranslator(locale), preference, setPreference, theme, colors: paletteFor(theme) };
  }, [locale, setLocale, preference, setPreference, systemScheme]);

  if (!loaded) {
    // A plain background in the system theme while storage is read (a few milliseconds).
    return <View style={{ flex: 1, backgroundColor: paletteFor(systemScheme === "dark" ? "dark" : "light").background }} />;
  }
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

/** Shorthands for components that need only part of the context. */
export const useTheme = () => {
  const { colors, theme } = usePreferences();
  return { colors, theme };
};
export const useI18n = () => {
  const { t, locale, setLocale } = usePreferences();
  return { t, locale, setLocale };
};
