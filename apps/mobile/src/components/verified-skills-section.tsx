import { skillMedal, verifiedSkillLevel } from "@skillprove/shared";
import { spacing } from "@skillprove/shared/design";
import { formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { queryKeys, useApiClient } from "../lib/use-api";
import { useI18n } from "../theme/preferences-provider";
import { MedalFor } from "./medal-for";
import { QueryState } from "./query-state";
import { Alert, AppText, Badge, Button, Card, CardHeader, EmptyState, Separator } from "./ui";

/**
 * The owner's verified skills on their profile, with medals. Read-only. The owner always sees
 * them; when "show verified skills" is off, a note says companies do not.
 */
export function VerifiedSkillsSection({ shownToCompanies }: { shownToCompanies: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  return (
    <Card>
      <CardHeader title={t("passport.verifiedTitle")} action={<Button label={t("home.viewAll")} variant="link" onPress={() => router.push("/skill-passport")} />} />
      {!shownToCompanies && <Alert tone="info" message={t("profile.verifiedHidden")} />}
      {!passport.isSuccess ? (
        <QueryState query={passport} skeleton={[48, 48]} />
      ) : passport.data.verified.length === 0 ? (
        <EmptyState icon="award" title={t("profile.verifiedEmpty")} />
      ) : (
        [...passport.data.verified]
          .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
          .map((v, index) => {
            const level = verifiedSkillLevel(v.score, v.confidence);
            const outdated = v.evidenceStatus === "OUTDATED";
            return (
              <View key={v.skill.id}>
                {index > 0 && <Separator />}
                <View style={styles.row}>
                  {/* A fixed slot, so names line up whether or not a skill has a medal. */}
                  <View style={styles.medalSlot}>
                    <MedalFor medal={skillMedal(v.score, v.confidence)} outdated={outdated} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="label">{v.skill.name}</AppText>
                    <AppText variant="bodySmall" tone="mutedForeground">
                      {t("passport.scoreOutOf", { score: formatNumber(locale, v.score, { maximumFractionDigits: 1 }) })}
                    </AppText>
                  </View>
                  <View style={styles.badges}>
                    <Badge tone={level ? "info" : "neutral"} label={level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")} />
                    {outdated && <Badge tone="warning" label={t("passport.outdated")} />}
                  </View>
                </View>
              </View>
            );
          })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2] },
  medalSlot: { width: 18, alignItems: "center" },
  badges: { alignItems: "flex-end", gap: spacing[1] },
});
