import { en, type Messages } from "./messages/en";
import { sq } from "./messages/sq";

export type { Messages };

export const LOCALES = ["sq", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sq";
export const LOCALE_STORAGE_KEY = "sp-locale";

/** Kosovo defaults. Intl tags use the country so formats follow local conventions. */
export const REGION = {
  country: "XK",
  currency: "EUR",
  phonePrefix: "+383",
  timeZone: "Europe/Belgrade",
} as const;

const INTL_TAGS: Record<Locale, string> = { sq: "sq-XK", en: "en-GB" };
const MESSAGES: Record<Locale, Messages> = { sq, en };

export function parseLocale(value: unknown): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
/** Every dot path to a string, such as "nav.account". */
export type MessageKey<T = Messages> = {
  [K in keyof T]: T[K] extends string ? K & string : Join<K, MessageKey<T[K]>>;
}[keyof T];

export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    node = typeof node === "object" && node !== null ? (Reflect.get(node, part) as unknown) : undefined;
  }
  // The key type makes a miss impossible at compile time; at runtime fall back to the key itself.
  return typeof node === "string" ? node : key;
}

export function createTranslator(locale: Locale): Translate {
  const messages = MESSAGES[locale];
  return (key, params) => {
    const text = lookup(messages, key);
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  };
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

export function formatDate(locale: Locale, date: Date, options: Intl.DateTimeFormatOptions = { dateStyle: "long" }) {
  return new Intl.DateTimeFormat(INTL_TAGS[locale], { timeZone: REGION.timeZone, ...options }).format(date);
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(INTL_TAGS[locale], options).format(value);
}

export function formatCurrency(locale: Locale, amount: number) {
  return new Intl.NumberFormat(INTL_TAGS[locale], { style: "currency", currency: REGION.currency }).format(amount);
}

/** Up to two initials, first and last name, so "Arta Krasniqi" becomes "AK". Used by avatars. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part?.[0] ?? "").join("").toLocaleUpperCase();
}

/** Formats a Kosovo number such as 044123456 or +38344123456 as "+383 44 123 456". */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("383") ? digits.slice(3) : digits.replace(/^0/, "");
  if (national.length !== 8) return value;
  return `${REGION.phonePrefix} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}
