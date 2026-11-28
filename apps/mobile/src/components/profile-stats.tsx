import { earnedMedalCount, passportSkillCount, profileCompleteness } from "@skillprove/shared";
import { spacing } from "@skillprove/shared/design";
import { formatNumber } from "@skillprove/shared/i18n";
import type { OwnProfile } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { queryKeys, useApiClient } from "../lib/use-api";
import { useI18n } from "../theme/preferences-provider";
import { Skeleton, StatCard } from "./ui";

/**
 * Three real numbers about the owner's profile: verified skills, medals and completeness. All
 * come from the Skill Passport and the profile; nothing is estimated. If the passport fails, the
 * Verified skills section shows the error and retry, so this shows nothing.
 */
export function ProfileStats({ profile }: { profile: OwnProfile }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  if (passport.isPending) {
    return (
      <View style={styles.row}>
        <Skeleton height={110} style={styles.flex} />
        <Skeleton height={110} style={styles.flex} />
        <Skeleton height={110} style={styles.flex} />
      </View>
    );
  }
  if (passport.isError) return null;

  const completeness = profileCompleteness(profile, passportSkillCount(passport.data));
  return (
    <View style={styles.row}>
      <StatCard icon="check-circle" value={formatNumber(locale, passport.data.verified.length)} label={t("home.statVerified")} />
      <StatCard icon="award" value={formatNumber(locale, earnedMedalCount(passport.data.verified))} label={t("profile.medalsEarned")} />
      <StatCard icon="user" value={formatNumber(locale, completeness.percent / 100, { style: "percent" })} label={t("home.statComplete")} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[3] },
  flex: { flex: 1 },
});
