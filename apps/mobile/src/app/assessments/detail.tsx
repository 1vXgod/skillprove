import { formatDate } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, CardHeader } from "../../components/ui";
import { QueryState } from "../../components/query-state";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { controlHeights, spacing } from "@skillprove/shared/design";

export default function AssessmentDetailScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <DetailContent />
      </SignedInGate>
    </Screen>
  );
}

const tone = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" } as const;

/** Status, version and structure only. Answer keys are not shown here; editing is on the website. */
function DetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const client = useApiClient();
  const detail = useQuery({ queryKey: queryKeys.assessment(id, locale), queryFn: () => client.getAssessment(id), retry: false });
  const versions = useQuery({ queryKey: queryKeys.versions(id), queryFn: () => client.listVersions(id), retry: false });

  if (!detail.isSuccess) return <QueryState query={detail} skeleton={[64, 160]} />;
  const a = detail.data;
  return (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {a.title}
      </AppText>
      <View style={styles.wrap}>
        <Badge tone={tone[a.version.status]} label={t(`assessments.status.${a.version.status}`)} />
        <Badge label={t("assessments.list.version", { version: a.version.version })} />
        <Badge label={t(`assessments.source.${a.creationSource}`)} />
      </View>
      {a.description && <AppText>{a.description}</AppText>}

      <Card>
        <CardHeader title={t("assessments.editor.details")} />
        <AppText variant="bodySmall">
          {[a.assessmentType ? t(`assessments.type.${a.assessmentType}`) : null, t(`assessments.difficulty.${a.difficulty as "BEGINNER"}`), a.durationMinutes ? t("assessments.preview.minutes", { minutes: a.durationMinutes }) : null]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("assessments.list.questions", { count: a.questions.length })}
        </AppText>
        <View style={styles.wrap}>
          {a.skills.map((s) => (
            <Badge key={s.skillId} tone="info" label={s.name} />
          ))}
        </View>
      </Card>

      {a.version.status === "DRAFT" && a.publishIssues.length > 0 && (
        <Alert tone="warning" title={t("assessments.editor.cannotPublish")} message={a.publishIssues.map((issue) => t(`assessments.issues.${issue as "titleRequired"}`)).join("\n")} />
      )}

      {a.aiJobId && <Button label={t("assessments.mobile.jobs")} variant="outline" icon="cpu" onPress={() => router.push({ pathname: "/assessments/job", params: { id: a.aiJobId as string } })} fullWidth />}

      <Card>
        <CardHeader title={t("assessments.versions.title")} description={t("assessments.versions.immutable")} />
        {!versions.isSuccess ? (
          <QueryState query={versions} skeleton={[48]} />
        ) : (
          versions.data.items.map((v) => (
            <View key={v.id} style={styles.versionRow}>
              <AppText variant="label">{t("assessments.versions.version", { version: v.version })}</AppText>
              <Badge tone={tone[v.status]} label={t(`assessments.status.${v.status}`)} />
              <AppText variant="caption" tone="mutedForeground">
                {formatDate(locale, new Date(v.publishedAt ?? v.createdAt))}
              </AppText>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  versionRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch, flexWrap: "wrap" },
});
