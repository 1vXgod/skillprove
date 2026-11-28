"use client";

import { skillMedal, verifiedSkillLevel } from "@skillprove/shared";
import { formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { AwardIcon, EyeOffIcon } from "../icons";
import { MedalFor } from "../passport/medal";
import { Alert, Badge, Button, buttonClasses, Card, CardContent, EmptyState, IconTile, Progress, Skeleton } from "../ui";

/**
 * The owner's verified skills on their profile, with medals. Read-only. The owner always sees
 * them; when "show verified skills" is off, a note says companies do not.
 */
export function VerifiedSkillsSection({ shownToCompanies }: { shownToCompanies: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  let body;
  if (passport.isPending) body = <Skeleton className="h-16 w-full" />;
  else if (passport.isError)
    body = (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, passport.error)}
          <Button size="sm" variant="outline" onClick={() => void passport.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  else if (passport.data.verified.length === 0)
    body = (
      <EmptyState
        icon={<AwardIcon size={20} />}
        title={t("profile.verifiedEmpty")}
        className="py-8"
        action={
          <Link href="/take" className={buttonClasses({ variant: "glow", size: "sm" })}>
            {t("profile.verifiedTake")}
          </Link>
        }
      />
    );
  else
    body = (
      <ul data-testid="profile-verified-skills" className="flex flex-col divide-y divide-border">
        {[...passport.data.verified]
          .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
          .map((v) => {
            const level = verifiedSkillLevel(v.score, v.confidence);
            const outdated = v.evidenceStatus === "OUTDATED";
            const score = formatNumber(locale, v.score, { maximumFractionDigits: 1 });
            return (
              <li key={v.skill.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/* A fixed slot, so names line up whether or not a skill has a medal. */}
                <span className="flex w-5 shrink-0 justify-center">
                  <MedalFor medal={skillMedal(v.score, v.confidence)} outdated={outdated} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="type-label text-foreground">{v.skill.name}</span>
                    <span className="type-body-small tabular-nums text-muted-foreground">{t("passport.scoreOutOf", { score })}</span>
                  </span>
                  <Progress value={v.score} label={`${v.skill.name}: ${t("passport.scoreOutOf", { score })}`} className={outdated ? "opacity-60" : undefined} />
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={level ? "info" : "neutral"}>{level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")}</Badge>
                    {outdated && <Badge tone="warning">{t("passport.outdated")}</Badge>}
                  </span>
                </span>
              </li>
            );
          })}
      </ul>
    );

  return (
    <Card>
      <div className="flex items-center gap-3 px-6 pt-6">
        <IconTile icon={<AwardIcon size={18} />} tone="warning" size="sm" />
        <h2 className="min-w-0 flex-1 type-h4 text-foreground">{t("passport.verifiedTitle")}</h2>
        <Link href="/skill-passport" className="type-label text-accent underline-offset-4 hover:underline">
          {t("home.viewAll")}
        </Link>
      </div>
      <CardContent className="flex flex-col gap-4 pt-4">
        {!shownToCompanies && (
          <Link
            href="/profile/privacy"
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 type-body-small text-foreground underline-offset-4 hover:underline"
          >
            <EyeOffIcon size={16} className="shrink-0 text-warning" />
            {t("profile.verifiedHidden")}
          </Link>
        )}
        {body}
      </CardContent>
    </Card>
  );
}
