"use client";

import { THEME_PREFERENCES, type ThemePreference } from "@skillprove/shared/design";
import { LOCALES, formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { BuildingIcon, ChevronRightIcon, GlobeIcon, LinkIcon, LockIcon, MailIcon, MonitorIcon, MoonIcon, PaletteIcon, ShieldIcon, SignOutIcon, SunIcon, TrashIcon, UserIcon } from "../icons";
import { Alert, Avatar, Button, buttonClasses, Card, CardContent, Chip, IconTile, Radio, Skeleton } from "../ui";

const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ANONYMIZED"] as const;
const THEME_ICONS: Record<ThemePreference, ReactNode> = { light: <SunIcon size={18} />, dark: <MoonIcon size={18} />, system: <MonitorIcon size={18} /> };

/** Who is signed in, as the sign-in provider reports it. The account itself comes from the API. */
export interface AccountIdentity {
  name: string;
  imageUrl: string | null;
}

/**
 * Account and settings. Everything shown is real: the account from `GET /me`, preferences from
 * the same cookies as the top-bar menus, and password changes on the sign-in provider's hosted
 * page. There is no delete-account endpoint yet, so the danger zone points to deleting the
 * profile instead.
 */
export function AccountSettings({ identity, portalUrl, onSignOut }: { identity: AccountIdentity | null; portalUrl: string | null; onSignOut: (() => void) | null }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const account = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });

  const knownStatus = account.data ? USER_STATUSES.find((s) => s === account.data.status) : undefined;
  const statusLabel = account.data ? (knownStatus ? t(`account.userStatus.${knownStatus}`) : account.data.status) : null;
  const email = account.data?.email ?? null;
  const displayName = identity?.name ?? email ?? t("account.unverifiedEmail");

  return (
    <div data-testid="account-settings" className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-sidebar to-glow-primary p-6 text-sidebar-foreground shadow-card sm:p-8">
            <div className="flex items-center gap-4">
              <Avatar name={displayName} src={identity?.imageUrl ?? null} size="lg" className="ring-2 ring-sidebar-foreground/30" />
              <div className="flex min-w-0 flex-col gap-1">
                {account.isPending ? (
                  <>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </>
                ) : (
                  <>
                    <h2 className="truncate type-h3 text-sidebar-foreground">{displayName}</h2>
                    {email && <p className="truncate type-body-small text-sidebar-muted">{email}</p>}
                  </>
                )}
              </div>
            </div>
            {account.data && (
              <ul className="mt-4 flex flex-wrap gap-2">
                <Chip inverse icon={<ShieldIcon size={14} />}>
                  {statusLabel}
                </Chip>
                <Chip inverse icon={<MailIcon size={14} />}>
                  {email ? t("account.emailVerified") : t("account.emailNotVerified")}
                </Chip>
              </ul>
            )}
        </section>

        {account.isError && <Alert tone="error">{t("account.loadFailed")}</Alert>}

        <Card>
          <CardContent className="flex flex-col gap-4">
            <Heading icon={<UserIcon size={18} />} title={t("account.title")} />
            {account.isPending ? (
              <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : account.data ? (
              <dl className="flex flex-col divide-y divide-border">
                <Row icon={<MailIcon size={16} />} label={t("account.email")} value={email ?? t("account.emailNotVerified")} />
                <Row icon={<ShieldIcon size={16} />} label={t("account.status")} value={statusLabel} />
                <Row icon={<BuildingIcon size={16} />} label={t("account.companyMemberships")} value={formatNumber(locale, account.data.companies.length)} />
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <Heading icon={<LockIcon size={18} />} title={t("account.security")} />
            {portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="text-muted-foreground" aria-hidden="true">
                  <LinkIcon size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="type-label text-foreground">{t("account.manageSecurity")}</span>
                  <span className="type-body-small text-muted-foreground">{t("account.manageSecurityHelp")}</span>
                </span>
                <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                  <ChevronRightIcon size={18} />
                </span>
              </a>
            ) : (
              <p className="type-body-small text-muted-foreground">{t("auth.notConfiguredBody")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Preferences />

        {onSignOut && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <Heading icon={<SignOutIcon size={18} />} title={t("account.session")} />
              <Button variant="outline" icon={<SignOutIcon size={16} />} onClick={onSignOut}>
                {t("auth.signOut")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 type-h4 text-destructive">
              <TrashIcon size={18} />
              {t("profile.dangerZone")}
            </h2>
            <p className="type-body-small text-muted-foreground">{t("account.deleteHint")}</p>
            <Link href="/profile" className={buttonClasses({ variant: "outline", size: "sm", className: "self-start" })}>
              {t("account.goToProfile")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Preferences() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Heading icon={<PaletteIcon size={18} />} title={t("account.preferences")} />
          <p className="type-body-small text-muted-foreground">{t("account.preferencesHelp")}</p>
        </div>
        <fieldset>
          <legend className="mb-3 type-label text-foreground">{t("language.label")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {LOCALES.map((option) => (
              <Radio
                key={option}
                card
                icon={<GlobeIcon size={18} />}
                name="language"
                value={option}
                // Each language is named in itself, so it can be found from either language.
                label={t(`language.${option}`)}
                checked={locale === option}
                onChange={() => setLocale(option)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 type-label text-foreground">{t("theme.label")}</legend>
          {/* Three across only where the card is wide enough for the Albanian labels. */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
            {THEME_PREFERENCES.map((option) => (
              <Radio key={option} card icon={THEME_ICONS[option]} name="theme" value={option} label={t(`theme.${option}`)} checked={preference === option} onChange={() => setPreference(option)} />
            ))}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}

function Heading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} size="sm" />
      <h2 className="type-h4 text-foreground">{title}</h2>
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <dt className="flex-1 type-label text-foreground">{label}</dt>
      <dd className="max-w-3/5 break-all text-right type-body text-muted-foreground">{value}</dd>
    </div>
  );
}
