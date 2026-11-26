import { parseThemePreference } from "@skillprove/shared/design";
import { parseLocale } from "@skillprove/shared/i18n";
import { cookies } from "next/headers";
import { PREFERENCE_COOKIES } from "./preferences";

export async function getRequestPreferences() {
  const store = await cookies();
  return {
    locale: parseLocale(store.get(PREFERENCE_COOKIES.locale)?.value),
    theme: parseThemePreference(store.get(PREFERENCE_COOKIES.theme)?.value),
    /** False until the visitor picks a theme, so a page can choose its own default (the landing page is dark). */
    themeChosen: store.has(PREFERENCE_COOKIES.theme),
  };
}
