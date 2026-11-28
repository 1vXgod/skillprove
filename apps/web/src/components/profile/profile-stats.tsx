"use client";

import { earnedMedalCount, passportSkillCount, profileCompleteness } from "@skillprove/shared";
import { formatNumber } from "@skillprove/shared/i18n";
import type { OwnProfile } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { AwardIcon, SuccessIcon, UserIcon } from "../icons";
import { Skeleton, StatCard } from "../ui";

/**
 * Three real numbers about the owner's profile: verified skills, medals and completeness. All
 * come from the Skill Passport and the profile; nothing is estimated. While the passport loads
 * the tiles wait; if it fails, the Verified skills section below shows the error and retry.
 */
export function ProfileStats({ profile }: { profile: OwnProfile }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  if (passport.isPending) {
    return (
      <div aria-hidden="true" className="grid grid-cols-3 gap-3 sm:gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (passport.isError) return null;

  const completeness = profileCompleteness(profile, passportSkillCount(passport.data));
  return (
    <div data-testid="profile-stats" className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard tone="success" icon={<SuccessIcon size={20} />} value={formatNumber(locale, passport.data.verified.length)} label={t("home.statVerified")} />
      <StatCard tone="warning" icon={<AwardIcon size={20} />} value={formatNumber(locale, earnedMedalCount(passport.data.verified))} label={t("profile.medalsEarned")} />
      <StatCard icon={<UserIcon size={20} />} value={formatNumber(locale, completeness.percent / 100, { style: "percent" })} label={t("home.statComplete")} />
    </div>
  );
}
