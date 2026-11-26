"use client";

import { availableCount, continueAttempt, profileCompleteness, recentActivity, topVerifiedSkills, type ActivityKind, type ProfileCompletenessItem } from "@skillprove/shared";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ClipboardIcon, InboxIcon, SuccessIcon, UserIcon } from "../icons";
import { Alert, Badge, Button, buttonClasses, Card, CardContent, EmptyState, HeroCard, Progress, SkillRow, Skeleton, StatCard } from "../ui";

/**
 * The candidate home (Milestone 7 polish, step 3): a greeting, the attempt in progress if any,
 * three real numbers, the Skill Passport, recent activity, profile completeness and a way into
 * the assessments. Each card loads, fails and retries on its own. Every value comes from the API.
 */
export function HomeDashboard() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });
  const takeable = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });

  const firstName = profile.data?.fullName.trim().split(/\s+/)[0];
  const skillCount = passport.data ? new Set([...passport.data.verified.map((v) => v.skill.id), ...passport.data.selfReported.map((s) => s.skill.id)]).size : 0;
  const completeness = profile.isSuccess && passport.isSuccess ? profileCompleteness(profile.data, skillCount) : null;
  const open = takeable.data ? continueAttempt(takeable.data.items) : null;
  // Completeness needs both the profile and the Skill Passport; until then, show whichever is not ready.
  const completenessWait: UseQueryResult<unknown> = profile.isSuccess ? passport : profile;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-h1 text-foreground">{firstName ? t("home.greeting", { name: firstName }) : t("home.greetingNoName")}</h1>
        <p className="type-body text-muted-foreground">{t("home.subtitle")}</p>
      </header>

      {open && (
        <section aria-labelledby="home-continue" className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardIcon size={18} />
            </span>
            <div>
              <h2 id="home-continue" className="type-h4 text-foreground">{t("home.continueTitle")}</h2>
              <p className="type-body-small text-muted-foreground">{t("home.continueBody", { title: open.title })}</p>
            </div>
          </div>
          <Link href={`/take/${encodeURIComponent(open.attemptId)}`} className={buttonClasses({ variant: "glow" })}>
            {t("home.continueAction")}
          </Link>
        </section>
      )}

      <section aria-label={t("home.title")} className="grid gap-4 sm:grid-cols-3">
        <Loaded query={passport} skeleton="h-32">
          {(data) => <StatCard tone="success" icon={<SuccessIcon size={20} />} value={formatNumber(locale, data.verified.length)} label={t("home.statVerified")} />}
        </Loaded>
        {completeness ? (
          <StatCard icon={<UserIcon size={20} />} value={formatNumber(locale, completeness.percent / 100, { style: "percent" })} label={t("home.statComplete")} />
        ) : (
          <Loaded query={completenessWait} skeleton="h-32">
            {() => null}
          </Loaded>
        )}
        <Loaded query={takeable} skeleton="h-32">
          {(data) => <StatCard tone="info" icon={<ClipboardIcon size={20} />} value={formatNumber(locale, availableCount(data.items))} label={t("home.statAvailable")} />}
        </Loaded>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeaderRow title={t("home.passportTitle")} href="/skill-passport" linkLabel={t("home.viewAll")} />
            <CardContent>
              <Loaded query={passport} skeleton="h-40">
                {(data) => {
                  const top = topVerifiedSkills(data);
                  if (top.length === 0) {
                    return (
                      <EmptyState
                        icon={<SuccessIcon size={20} />}
                        title={t("home.passportEmpty")}
                        action={
                          <Link href="/take" className={buttonClasses({ size: "sm" })}>
                            {t("home.takeAction")}
                          </Link>
                        }
                      />
                    );
                  }
                  return (
                    <ul className="-mx-3 flex flex-col">
                      {top.map((s) => (
                        <li key={s.skillId}>
                          <SkillRow
                            icon={<SuccessIcon size={18} />}
                            title={s.name}
                            detail={`${t("passport.scoreOutOf", { score: formatNumber(locale, s.score, { maximumFractionDigits: 1 }) })} · ${s.level ? t(`passport.levels.${s.level}`) : t("passport.moreAssessmentsNeeded")}`}
                            badge={<Badge tone="success">{t("passport.verified")}</Badge>}
                            href="/skill-passport"
                          />
                        </li>
                      ))}
                    </ul>
                  );
                }}
              </Loaded>
            </CardContent>
          </Card>

          <Card>
            <CardHeaderRow title={t("home.activityTitle")} />
            <CardContent>
              <Loaded query={passport} skeleton="h-32">
                {(data) => {
                  const items = recentActivity(data);
                  if (items.length === 0) return <EmptyState icon={<InboxIcon size={20} />} title={t("home.activityEmpty")} />;
                  return (
                    <ol className="flex flex-col divide-y divide-border">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                          <ActivityIcon kind={item.kind} />
                          <div className="min-w-0">
                            <p className="type-label text-foreground">{t(`home.activity.${item.kind}`, { title: item.title })}</p>
                            <p className="type-caption text-muted-foreground">
                              <time dateTime={item.at}>{formatDate(locale, new Date(item.at))}</time>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  );
                }}
              </Loaded>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeaderRow title={t("completeness.title")} />
            <CardContent>
              {completeness ? (
                <div className="flex flex-col gap-3">
                  <Progress value={completeness.percent} label={t("completeness.percent", { percent: completeness.percent })} />
                  <p className="type-label text-foreground">{t("completeness.percent", { percent: completeness.percent })}</p>
                  {completeness.next ? (
                    <Link href={COMPLETENESS_LINKS[completeness.next]} className={buttonClasses({ variant: "outline", size: "sm", className: "self-start" })}>
                      {t(`completeness.items.${completeness.next}`)}
                    </Link>
                  ) : (
                    <p className="type-body-small text-success">{t("completeness.complete")}</p>
                  )}
                </div>
              ) : (
                <Loaded query={completenessWait} skeleton="h-24">
                  {() => null}
                </Loaded>
              )}
            </CardContent>
          </Card>

          <Loaded query={takeable} skeleton="h-44">
            {(data) => {
              const count = availableCount(data.items);
              return (
                <HeroCard
                  mark={false}
                  title={t("home.takeTitle")}
                  body={count > 0 ? t("home.takeBody", { count: formatNumber(locale, count) }) : t("home.takeEmpty")}
                  action={
                    <Link href="/take" className={buttonClasses({ variant: "glow", className: "mt-1" })}>
                      {t("home.takeAction")}
                    </Link>
                  }
                />
              );
            }}
          </Loaded>
        </div>
      </div>
    </div>
  );
}

/** Where each missing profile item is added. */
const COMPLETENESS_LINKS: Record<ProfileCompletenessItem, string> = {
  profile: "/profile",
  headline: "/profile",
  skills: "/skill-passport",
  experience: "/profile",
  biography: "/profile",
  location: "/profile",
  education: "/profile",
  languages: "/profile",
  preferences: "/profile",
};

function CardHeaderRow({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5">
      <h2 className="type-h4 text-foreground">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="type-label text-accent hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

const ACTIVITY_ICONS: Record<ActivityKind, { icon: ReactNode; tone: string }> = {
  verified: { icon: <SuccessIcon size={16} />, tone: "bg-success-subtle text-success" },
  submitted: { icon: <ClipboardIcon size={16} />, tone: "bg-info-subtle text-info" },
  started: { icon: <ClipboardIcon size={16} />, tone: "bg-secondary text-primary" },
};

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const { icon, tone } = ACTIVITY_ICONS[kind];
  return (
    <span aria-hidden="true" className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      {icon}
    </span>
  );
}

/** A query's loading and failed states for one card; renders the card once the data is there. */
function Loaded<T>({ query, skeleton, children }: { query: UseQueryResult<T>; skeleton: string; children: (data: T) => ReactNode }) {
  const { t } = useI18n();
  if (query.isPending) return <Skeleton className={`w-full rounded-xl ${skeleton}`} />;
  if (query.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, query.error)}
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  return <>{children(query.data)}</>;
}
