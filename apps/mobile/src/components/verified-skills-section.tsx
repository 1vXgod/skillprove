import { skillMedal, verifiedSkillLevel } from "@skillprove/shared";
import { radius, spacing } from "@skillprove/shared/design";
import { formatNumber } from "@skillprove/shared/i18n";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { queryKeys, useApiClient } from "../lib/use-api";
import { useI18n, useTheme } from "../theme/preferences-provider";
import { MedalFor } from "./medal-for";
import { QueryState } from "./query-state";
import { AppText, Badge, Button, Card, EmptyState, IconTile, Progress, Separator } from "./ui";

/**
 * The owner's verified skills on their profile, with medals. Read-only. The owner always sees
 * them; when "show verified skills" is off, a note says companies do not.
 */
export function VerifiedSkillsSection({ shownToCompanies }: { shownToCompanies: boolean }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  return (
    <Card>
      <View style={styles.heading}>
        <IconTile icon="award" tone="warning" size="sm" />
        <AppText variant="h4" accessibilityRole="header" style={styles.flex}>
          {t("passport.verifiedTitle")}
        </AppText>
        <Button label={t("home.viewAll")} variant="link" onPress={() => router.push("/skill-passport")} />
      </View>
      {!shownToCompanies && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/profile/privacy")}
          style={[styles.note, { backgroundColor: colors.warningSubtle, borderColor: colors.warning }]}
        >
          <Feather name="eye-off" size={16} color={colors.warning} accessibilityElementsHidden importantForAccessibility="no" />
          <AppText variant="bodySmall" style={styles.flex}>
            {t("profile.verifiedHidden")}
          </AppText>
        </Pressable>
      )}
      {!passport.isSuccess ? (
        <QueryState query={passport} skeleton={[48, 48]} />
      ) : passport.data.verified.length === 0 ? (
        <EmptyState icon="award" title={t("profile.verifiedEmpty")} action={<Button label={t("profile.verifiedTake")} variant="glow" size="sm" onPress={() => router.push("/take")} />} />
      ) : (
        [...passport.data.verified]
          .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
          .map((v, index) => {
            const level = verifiedSkillLevel(v.score, v.confidence);
            const outdated = v.evidenceStatus === "OUTDATED";
            const score = t("passport.scoreOutOf", { score: formatNumber(locale, v.score, { maximumFractionDigits: 1 }) });
            return (
              <View key={v.skill.id}>
                {index > 0 && <Separator />}
                <View style={styles.row}>
                  {/* A fixed slot, so names line up whether or not a skill has a medal. */}
                  <View style={styles.medalSlot}>
                    <MedalFor medal={skillMedal(v.score, v.confidence)} outdated={outdated} />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.titleLine}>
                      <AppText variant="label" style={styles.flex}>
                        {v.skill.name}
                      </AppText>
                      <AppText variant="bodySmall" tone="mutedForeground">
                        {score}
                      </AppText>
                    </View>
                    <View style={outdated ? styles.faded : undefined}>
                      <Progress value={v.score} label={`${v.skill.name}: ${score}`} />
                    </View>
                    <View style={styles.badges}>
                      <Badge tone={level ? "info" : "neutral"} label={level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")} />
                      {outdated && <Badge tone="warning" label={t("passport.outdated")} />}
                    </View>
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
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  note: { flexDirection: "row", alignItems: "center", gap: spacing[2], borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], paddingVertical: spacing[3] },
  medalSlot: { width: spacing[5], alignItems: "center", paddingTop: spacing[0.5] },
  body: { flex: 1, gap: spacing[1.5] },
  titleLine: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[1.5] },
  faded: { opacity: 0.6 },
});
