import { verifiedSkillLevel } from "@skillprove/shared";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import type { SkillPassport, VerifiedSkillWithEvidence } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, CardHeader, EmptyState, Progress, Separator, StatCard } from "../../components/ui";
import { QueryState } from "../../components/query-state";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n, useTheme } from "../../theme/preferences-provider";
import { radius, spacing } from "@skillprove/shared/design";
import { Feather } from "@expo/vector-icons";

export default function SkillPassportScreen() {
  return (
    <Screen>
      <SignedInGate>
        <PassportContent />
      </SignedInGate>
    </Screen>
  );
}

function PassportContent() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("passport.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("passport.description")}</AppText>
      {!passport.isSuccess ? (
        <QueryState query={passport} skeleton={[120, 120]} />
      ) : (
        <Sections passport={passport.data} />
      )}
    </>
  );
}

function Sections({ passport }: { passport: SkillPassport }) {
  const { t, locale } = useI18n();
  const verifiedIds = new Set(passport.verified.map((v) => v.skill.id));
  const date = (iso: string) => formatDate(locale, new Date(iso));
  const count = (n: number) => formatNumber(locale, n);

  return (
    <>
      {/* Real counts, one per section below. */}
      <View style={styles.stats}>
        <StatCard icon="check-circle" value={count(passport.verified.length)} label={t("passport.verifiedTitle")} />
        <StatCard icon="clipboard" value={count(passport.inAssessment.length)} label={t("passport.inAssessmentTitle")} />
        <StatCard icon="user" value={count(passport.selfReported.length)} label={t("passport.selfReportedTitle")} />
      </View>

      <AppText variant="h3" accessibilityRole="header">
        {t("passport.verifiedTitle")}
      </AppText>
      {passport.verified.length === 0 ? (
        <Card>
          <EmptyState icon="award" title={t("passport.verifiedEmpty")} />
        </Card>
      ) : (
        passport.verified.map((skill) => <VerifiedSkill key={skill.skill.id} skill={skill} />)
      )}

      <Card>
        <CardHeader title={t("passport.inAssessmentTitle")} />
        {passport.inAssessment.length === 0 ? (
          <EmptyState icon="clipboard" title={t("passport.inAssessmentEmpty")} />
        ) : (
          passport.inAssessment.map((entry, index) => (
            <View key={entry.skill.id}>
              {index > 0 && <Separator />}
              <View style={styles.row}>
                <IconTile icon="clipboard" tone="info" />
                <View style={[styles.flex, styles.gapSmall]}>
                  <AppText variant="label">{entry.skill.name}</AppText>
                  {entry.attempts.map((attempt) => (
                    <View key={attempt.attemptId} style={styles.gapSmall}>
                      <Badge tone="info" label={t(`passport.stage.${attempt.stage}`)} />
                      <AppText variant="bodySmall" tone="mutedForeground">
                        {attempt.assessmentTitle} · {attempt.submittedAt ? `${t("passport.submitted")} ${date(attempt.submittedAt)}` : `${t("passport.started")} ${date(attempt.startedAt)}`}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <CardHeader title={t("passport.selfReportedTitle")} description={t("passport.selfReportedNote")} />
        {passport.selfReported.length === 0 ? (
          <EmptyState title={t("passport.selfReportedEmpty")} />
        ) : (
          passport.selfReported.map((item, index) => (
            <View key={item.skill.id}>
              {index > 0 && <Separator />}
              <View style={styles.row}>
                <IconTile icon="user" tone="primary" />
                <View style={[styles.flex, styles.gapSmall]}>
                  <AppText variant="label">{item.skill.name}</AppText>
                  <View style={styles.inline}>
                    <Badge label={t("passport.selfReported")} />
                    {verifiedIds.has(item.skill.id) && <Badge tone="success" label={t("passport.alsoVerified")} />}
                  </View>
                  <AppText variant="bodySmall" tone="mutedForeground">
                    {t(`passport.levels.${item.level}`)}
                    {item.yearsOfExperience !== null ? ` · ${t("passport.yearsValue", { years: formatNumber(locale, item.yearsOfExperience) })}` : ""}
                  </AppText>
                </View>
                <Button
                  label={t("common.edit")}
                  variant="ghost"
                  size="sm"
                  accessibilityLabel={`${t("common.edit")}: ${item.skill.name}`}
                  onPress={() => router.push({ pathname: "/profile/skill", params: { skillId: item.skill.id } })}
                />
              </View>
            </View>
          ))
        )}
        <Button label={t("passport.addSkill")} variant="outline" icon="plus" onPress={() => router.push("/profile/skill")} fullWidth />
      </Card>
    </>
  );
}

/** A tinted square with an icon, matching the web cards. Decorative. */
function IconTile({ icon, tone }: { icon: "check-circle" | "clipboard" | "user"; tone: "success" | "info" | "primary" }) {
  const { colors } = useTheme();
  const background = tone === "success" ? colors.successSubtle : tone === "info" ? colors.infoSubtle : colors.secondary;
  const color = tone === "success" ? colors.success : tone === "info" ? colors.info : colors.primary;
  return (
    <View style={[styles.tile, { backgroundColor: background }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Feather name={icon} size={18} color={color} />
    </View>
  );
}

/** Read-only: there is no control to change a verified result. */
function VerifiedSkill({ skill }: { skill: VerifiedSkillWithEvidence }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const outdated = skill.evidenceStatus === "OUTDATED";
  const level = verifiedSkillLevel(skill.score, skill.confidence);
  const score = t("passport.scoreOutOf", { score: formatNumber(locale, skill.score, { maximumFractionDigits: 1 }) });
  const details: [string, string][] = [
    [t("passport.confidence"), formatNumber(locale, skill.confidence / 100, { style: "percent" })],
    [t("passport.highestDifficulty"), t(`passport.difficulty.${skill.highestDifficulty}`)],
    [t("passport.lastVerified"), formatDate(locale, new Date(skill.lastVerifiedAt))],
  ];
  return (
    <Card>
      <View style={styles.row}>
        <IconTile icon="check-circle" tone="success" />
        <AppText variant="h4" style={styles.flex}>
          {skill.skill.name}
        </AppText>
        <Badge tone={outdated ? "warning" : "success"} label={outdated ? t("passport.outdated") : t("passport.verified")} />
      </View>
      <View style={styles.between}>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("passport.verifiedLevel")}
        </AppText>
        <Badge tone={level ? "info" : "neutral"} label={level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")} />
      </View>
      <View style={styles.gapSmall}>
        <View style={styles.between}>
          <AppText variant="bodySmall" tone="mutedForeground">
            {t("passport.score")}
          </AppText>
          <AppText variant="label">{score}</AppText>
        </View>
        <Progress value={skill.score} label={`${t("passport.score")}: ${score}`} />
      </View>
      <View style={[styles.gapSmall, styles.details, { borderTopColor: colors.border }]}>
        {details.map(([label, value]) => (
          <View key={label} style={styles.between}>
            <AppText variant="bodySmall" tone="mutedForeground">
              {label}
            </AppText>
            <AppText variant="label">{value}</AppText>
          </View>
        ))}
      </View>
      {outdated && <Alert tone="warning" message={t("passport.outdatedBody")} />}
      <View style={styles.gapSmall}>
        <AppText variant="label" tone="mutedForeground">
          {t("passport.evidence")} ({skill.evidence.length})
        </AppText>
        {skill.evidence.map((e) => (
          <AppText key={e.evaluationId} variant="caption" tone="mutedForeground">
            {e.assessmentTitle}
            {e.completedAt ? ` · ${formatDate(locale, new Date(e.completedAt))}` : ""} · {t(`passport.reviewStatus.${e.reviewStatus}`)}
            {e.superseded ? ` · ${t("passport.superseded")}` : ""}
          </AppText>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gapSmall: { gap: spacing[1.5] },
  flex: { flex: 1 },
  stats: { flexDirection: "row", gap: spacing[2] },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2] },
  between: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing[3] },
  tile: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
