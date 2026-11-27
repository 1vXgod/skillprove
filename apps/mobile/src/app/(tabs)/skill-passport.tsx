import { verifiedSkillLevel } from "@skillprove/shared";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import type { SkillPassport, VerifiedSkillWithEvidence } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, CardHeader, EmptyState, Separator } from "../../components/ui";
import { QueryState } from "../../components/query-state";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { spacing } from "@skillprove/shared/design";

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

  return (
    <>
      <Card>
        <CardHeader title={t("passport.verifiedTitle")} />
        {passport.verified.length === 0 ? <EmptyState icon="award" title={t("passport.verifiedEmpty")} /> : passport.verified.map((skill) => <VerifiedSkill key={skill.skill.id} skill={skill} />)}
      </Card>

      <Card>
        <CardHeader title={t("passport.inAssessmentTitle")} />
        {passport.inAssessment.length === 0 ? (
          <EmptyState icon="clipboard" title={t("passport.inAssessmentEmpty")} />
        ) : (
          passport.inAssessment.map((entry, index) => (
            <View key={entry.skill.id} style={styles.gapSmall}>
              {index > 0 && <Separator />}
              <AppText variant="label">{entry.skill.name}</AppText>
              {entry.attempts.map((attempt) => (
                <View key={attempt.attemptId} style={styles.inline}>
                  <Badge tone="info" label={t(`passport.stage.${attempt.stage}`)} />
                  <AppText variant="bodySmall" tone="mutedForeground" style={styles.flex}>
                    {attempt.assessmentTitle} · {attempt.submittedAt ? `${t("passport.submitted")} ${date(attempt.submittedAt)}` : `${t("passport.started")} ${date(attempt.startedAt)}`}
                  </AppText>
                </View>
              ))}
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
                <View style={[styles.flex, styles.gapSmall]}>
                  <View style={styles.inline}>
                    <AppText variant="label">{item.skill.name}</AppText>
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

/** Read-only: there is no control to change a verified result. */
function VerifiedSkill({ skill }: { skill: VerifiedSkillWithEvidence }) {
  const { t, locale } = useI18n();
  const outdated = skill.evidenceStatus === "OUTDATED";
  const level = verifiedSkillLevel(skill.score, skill.confidence);
  const rows: [string, string][] = [
    [t("passport.verifiedLevel"), level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")],
    [t("passport.score"), t("passport.scoreOutOf", { score: formatNumber(locale, skill.score, { maximumFractionDigits: 1 }) })],
    [t("passport.confidence"), formatNumber(locale, skill.confidence / 100, { style: "percent" })],
    [t("passport.highestDifficulty"), t(`passport.difficulty.${skill.highestDifficulty}`)],
    [t("passport.lastVerified"), formatDate(locale, new Date(skill.lastVerifiedAt))],
  ];
  return (
    <View style={[styles.verified, styles.gapSmall]}>
      <View style={styles.inline}>
        <AppText variant="h4" style={styles.flex}>
          {skill.skill.name}
        </AppText>
        <Badge tone={outdated ? "warning" : "success"} label={outdated ? t("passport.outdated") : t("passport.verified")} />
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.inline}>
          <AppText variant="bodySmall" tone="mutedForeground" style={styles.flex}>
            {label}
          </AppText>
          <AppText variant="label">{value}</AppText>
        </View>
      ))}
      {outdated && <Alert tone="warning" message={t("passport.outdatedBody")} />}
      <AppText variant="caption" tone="mutedForeground">
        {t("passport.evidence")}: {skill.evidence.map((e) => `${e.assessmentTitle} (${t(`passport.reviewStatus.${e.reviewStatus}`)}${e.superseded ? `, ${t("passport.superseded")}` : ""})`).join("; ")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  gapSmall: { gap: spacing[1.5] },
  flex: { flex: 1 },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingVertical: spacing[3] },
  verified: { paddingVertical: spacing[2] },
});
