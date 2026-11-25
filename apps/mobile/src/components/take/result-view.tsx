import { spacing } from "@skillprove/shared/design";
import { formatNumber } from "@skillprove/shared/i18n";
import type { AttemptResult } from "@skillprove/validation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { resultPollInterval, skillStanding } from "../../lib/result";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { Alert, AppText, Badge, Button, Card, CardHeader, EmptyState, Separator, Spinner } from "../ui";

/**
 * The result of a submitted attempt (Milestone 7, slice 15). Polls while scoring runs, then shows
 * the overall and per-skill percentages for this attempt and each skill's Skill Passport level.
 * The API never says which questions were right, so neither does this screen.
 */
export function ResultView({ attemptId, title }: { attemptId: string; title: string }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const result = useQuery({
    queryKey: queryKeys.attemptResult(attemptId, locale),
    queryFn: () => client.getAttemptResult(attemptId),
    retry: false,
    refetchInterval: (query) => resultPollInterval(query.state.data?.state),
  });
  const scored = result.data?.state === "scored";
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, enabled: scored, retry: false });

  // A new result changes the Skill Passport and the attempt counts in the list.
  useEffect(() => {
    if (!scored) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.passport(locale) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.takeable(locale) });
  }, [scored, queryClient, locale]);

  const heading = (
    <AppText variant="h1" accessibilityRole="header">
      {title}
    </AppText>
  );
  const actions = (
    <View style={styles.gap}>
      <Button label={t("take.openPassport")} icon="award" onPress={() => router.push("/skill-passport")} fullWidth />
      <Button label={t("take.backToList")} variant="outline" onPress={() => router.replace("/take")} fullWidth />
    </View>
  );

  if (result.isError) {
    return (
      <View style={styles.gap}>
        {heading}
        <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, result.error)} />
        <Button label={t("common.tryAgain")} variant="outline" onPress={() => void result.refetch()} />
      </View>
    );
  }
  if (result.isPending || result.data.state === "pending") {
    return (
      <View style={styles.gap}>
        {heading}
        <View style={styles.calculating} accessibilityLiveRegion="polite">
          <Spinner />
          <AppText variant="h3">{t("take.calculating")}</AppText>
          <AppText tone="mutedForeground">{t("take.calculatingBody")}</AppText>
        </View>
      </View>
    );
  }
  if (result.data.state === "failed") {
    return (
      <View style={styles.gap}>
        {heading}
        <EmptyState icon="alert-circle" title={t("take.failedTitle")} description={t("take.failedBody")} />
        {actions}
      </View>
    );
  }
  return (
    <View style={styles.gap}>
      {heading}
      <Scored result={result.data} passport={passport.data} />
      {actions}
    </View>
  );
}

function Scored({ result, passport }: { result: AttemptResult; passport: Parameters<typeof skillStanding>[0] }) {
  const { t, locale } = useI18n();
  const percent = (value: number) => formatNumber(locale, value / 100, { style: "percent", maximumFractionDigits: 0 });
  return (
    <>
      <Card style={styles.overall} accessibilityRole="summary">
        <AppText variant="label" tone="mutedForeground">
          {t("take.overall")}
        </AppText>
        <AppText variant="display">{percent(result.percent ?? 0)}</AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("take.questions", { count: result.questionCount })}
        </AppText>
      </Card>
      <Card>
        <CardHeader title={t("take.bySkill")} />
        {result.skills.map((skill, i) => {
          const standing = skillStanding(passport, skill.skillId);
          return (
            <View key={skill.skillId} style={styles.gapSmall}>
              {i > 0 && <Separator />}
              <View style={styles.inline}>
                <AppText variant="h4" style={styles.flex}>
                  {skill.name}
                </AppText>
                <AppText variant="h4">{percent(skill.percent)}</AppText>
              </View>
              <AppText variant="bodySmall" tone="mutedForeground">
                {t("take.answeredOf", { answered: skill.answeredCount, total: skill.questionCount })}
              </AppText>
              {standing && (
                <View style={styles.inline}>
                  <AppText variant="bodySmall" tone="mutedForeground" style={styles.flex}>
                    {t("take.passportLevel")}
                  </AppText>
                  <Badge
                    tone={standing.kind === "level" ? "success" : "neutral"}
                    label={standing.kind === "level" ? t(`passport.levels.${standing.level}`) : t("passport.moreAssessmentsNeeded")}
                  />
                </View>
              )}
            </View>
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  gapSmall: { gap: spacing[1.5] },
  flex: { flex: 1 },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  overall: { alignItems: "center", gap: spacing[1] },
  calculating: { alignItems: "center", gap: spacing[3], paddingVertical: spacing[8] },
});
