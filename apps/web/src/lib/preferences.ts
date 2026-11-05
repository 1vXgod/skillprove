import { THEME_STORAGE_KEY } from "@skillprove/shared/design";
import { LOCALE_STORAGE_KEY } from "@skillprove/shared/i18n";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Preferences live in cookies so the server renders the right theme and language first time. */
export const PREFERENCE_COOKIES = { theme: THEME_STORAGE_KEY, locale: LOCALE_STORAGE_KEY } as const;

export function writePreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}
