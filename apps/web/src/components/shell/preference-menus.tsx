"use client";

import { THEME_PREFERENCES, type ThemePreference } from "@skillprove/shared/design";
import { LOCALES } from "@skillprove/shared/i18n";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { GlobeIcon, MonitorIcon, MoonIcon, SunIcon } from "../icons";
import { DropdownMenu } from "../ui";

const THEME_ICONS: Record<ThemePreference, typeof SunIcon> = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };

const TRIGGER =
  "inline-flex h-10 items-center gap-2 rounded-md px-2.5 type-label text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground";

export function ThemeMenu() {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  const Current = THEME_ICONS[preference];
  return (
    <DropdownMenu
      trigger={(props) => (
        <button type="button" {...props} aria-label={`${t("theme.label")}: ${t(`theme.${preference}`)}`} className={TRIGGER}>
          <Current size={18} />
        </button>
      )}
      groups={[
        {
          label: t("theme.label"),
          items: THEME_PREFERENCES.map((option) => {
            const Icon = THEME_ICONS[option];
            return { key: option, label: t(`theme.${option}`), icon: <Icon size={16} />, checked: option === preference, onSelect: () => setPreference(option) };
          }),
        },
      ]}
    />
  );
}

export function LanguageMenu() {
  const { t, locale, setLocale } = useI18n();
  return (
    <DropdownMenu
      trigger={(props) => (
        <button type="button" {...props} aria-label={`${t("language.label")}: ${t(`language.${locale}`)}`} className={TRIGGER}>
          <GlobeIcon size={18} />
          <span className="uppercase">{locale}</span>
        </button>
      )}
      groups={[
        {
          label: t("language.label"),
          items: LOCALES.map((option) => ({
            key: option,
            // Each language is named in itself, so it can be found from either language.
            label: t(`language.${option}`),
            checked: option === locale,
            onSelect: () => setLocale(option),
          })),
        },
      ]}
    />
  );
}
