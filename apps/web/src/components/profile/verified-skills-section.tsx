"use client";

import { skillMedal, verifiedSkillLevel } from "@skillprove/shared";
import { formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { SuccessIcon } from "../icons";
import { MedalFor } from "../passport/medal";
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, Skeleton } from "../ui";

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
  else if (passport.data.verified.length === 0) body = <EmptyState icon={<SuccessIcon size={20} />} title={t("profile.verifiedEmpty")} />;
  else
    body = (
      <ul data-testid="profile-verified-skills" className="flex flex-col divide-y divide-border">
        {[...passport.data.verified]
          .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
          .map((v) => {
            const level = verifiedSkillLevel(v.score, v.confidence);
            const outdated = v.evidenceStatus === "OUTDATED";
            return (
              <li key={v.skill.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/* A fixed slot, so names line up whether or not a skill has a medal. */}
                <span className="flex w-5 shrink-0 justify-center">
                  <MedalFor medal={skillMedal(v.score, v.confidence)} outdated={outdated} />
                </span>
                <span className="min-w-0 flex-1 type-label text-foreground">{v.skill.name}</span>
                <span className="type-body-small tabular-nums text-muted-foreground">{t("passport.scoreOutOf", { score: formatNumber(locale, v.score, { maximumFractionDigits: 1 }) })}</span>
                <Badge tone={level ? "info" : "neutral"}>{level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")}</Badge>
                {outdated && <Badge tone="warning">{t("passport.outdated")}</Badge>}
              </li>
            );
          })}
      </ul>
    );

  return (
    <Card>
      <CardHeader
        title={t("passport.verifiedTitle")}
        action={
          <Link href="/skill-passport" className="type-label text-accent underline-offset-4 hover:underline">
            {t("home.viewAll")}
          </Link>
        }
      />
      <CardContent className="flex flex-col gap-4 pt-4">
        {!shownToCompanies && (
          <Alert tone="info">
            <Link href="/profile/privacy" className="underline-offset-4 hover:underline">
              {t("profile.verifiedHidden")}
            </Link>
          </Alert>
        )}
        {body}
      </CardContent>
    </Card>
  );
}
