"use client";

import { createTranslator, type Locale, type Translate } from "@skillprove/shared/i18n";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { PREFERENCE_COOKIES, writePreferenceCookie } from "./preferences";

interface I18nValue {
  locale: Locale;
  t: Translate;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const setLocale = useCallback(
    (next: Locale) => {
      writePreferenceCookie(PREFERENCE_COOKIES.locale, next);
      document.documentElement.lang = next;
      // Server components read the cookie, so re-render them in the new language.
      router.refresh();
    },
    [router],
  );
  const value = useMemo(() => ({ locale, t: createTranslator(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
