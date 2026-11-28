import { Feather } from "@expo/vector-icons";
import { ASSESSMENT_STATUS_TONE } from "@skillprove/shared";
import { controlHeights, radius, spacing } from "@skillprove/shared/design";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { STATUS_TILE } from "../../components/assessment-status";
import { QueryState } from "../../components/query-state";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { AppText, Badge, Card, Chip, IconTile, Separator, type IconName } from "../../components/ui";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n, useTheme } from "../../theme/preferences-provider";

export default function AssessmentDetailScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <DetailContent />
      </SignedInGate>
    </Screen>
  );
}

/** Status, version and structure only. Answer keys are not shown here; editing is on the website. */
function DetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const client = useApiClient();
  const detail = useQuery({ queryKey: queryKeys.assessment(id, locale), queryFn: () => client.getAssessment(id), retry: false });
  const versions = useQuery({ queryKey: queryKeys.versions(id), queryFn: () => client.listVersions(id), retry: false });

  if (!detail.isSuccess) return <QueryState query={detail} skeleton={[64, 160]} />;
  const a = detail.data;
  const tile = STATUS_TILE[a.version.status];
  const jobId = a.aiJobId;
  return (
    <View style={styles.gap}>
      <View style={styles.header}>
        <IconTile icon={tile.icon} tone={tile.tone} />
        <View style={styles.flex}>
          <AppText variant="h1" accessibilityRole="header">
            {a.title}
          </AppText>
        </View>
      </View>
      <View style={styles.wrap}>
        <Badge tone={ASSESSMENT_STATUS_TONE[a.version.status]} label={t(`assessments.status.${a.version.status}`)} />
        <Chip label={t("assessments.list.version", { version: a.version.version })} />
        <Chip icon={a.creationSource === "AI_GENERATED" ? "zap" : undefined} label={t(`assessments.source.${a.creationSource}`)} />
      </View>
      {a.description && <AppText tone="mutedForeground">{a.description}</AppText>}
      <AppText variant="bodySmall" tone="mutedForeground">
        {t("assessments.mobile.readOnlyShort")}
      </AppText>

      <Card>
        <Heading icon="file-text" title={t("assessments.editor.details")} />
        <View>
          {a.assessmentType && <InfoRow icon="layers" label={t("assessments.wizard.type")} value={t(`assessments.type.${a.assessmentType}`)} />}
          <InfoRow icon="bar-chart-2" label={t("assessments.wizard.difficulty")} value={t(`assessments.difficulty.${a.difficulty as "BEGINNER"}`)} separator={Boolean(a.assessmentType)} />
          {a.durationMinutes ? <InfoRow icon="clock" label={t("assessments.wizard.duration")} value={formatNumber(locale, a.durationMinutes)} separator /> : null}
          <InfoRow icon="list" label={t("assessments.editor.questions")} value={formatNumber(locale, a.questions.length)} separator />
        </View>
        {a.skills.length > 0 && (
          <View style={styles.wrap}>
            {a.skills.map((s) => (
              <Chip key={s.skillId} icon="tag" label={s.name} />
            ))}
          </View>
        )}
      </Card>

      {a.version.status === "DRAFT" && a.publishIssues.length > 0 && (
        <Card style={{ borderColor: colors.warning, backgroundColor: colors.warningSubtle }}>
          <Heading icon="alert-triangle" tone="warning" title={t("assessments.editor.cannotPublish")} />
          {a.publishIssues.map((issue) => (
            <View key={issue} style={styles.issue}>
              <Feather name="circle" size={8} color={colors.warning} style={styles.bullet} />
              <AppText variant="bodySmall" style={styles.flex}>
                {t(`assessments.issues.${issue as "titleRequired"}`)}
              </AppText>
            </View>
          ))}
        </Card>
      )}

      {jobId && (
        <Card style={styles.linkCard}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("assessments.mobile.jobs")}
            onPress={() => router.push({ pathname: "/assessments/job", params: { id: jobId } })}
            style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.muted }]}
          >
            <IconTile icon="zap" size="sm" />
            <AppText variant="label" style={styles.flex}>
              {t("assessments.mobile.jobs")}
            </AppText>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </Card>
      )}

      <Card>
        <Heading icon="git-commit" title={t("assessments.versions.title")} />
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("assessments.versions.immutable")}
        </AppText>
        {!versions.isSuccess ? (
          <QueryState query={versions} skeleton={[48]} />
        ) : (
          <View>
            {versions.data.items.map((v, index) => (
              <View key={v.id} style={styles.timelineRow}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: index === 0 ? colors.primary : colors.border }]} />
                  {index < versions.data.items.length - 1 && <View style={[styles.line, { backgroundColor: colors.border }]} />}
                </View>
                <View style={styles.timelineBody}>
                  <View style={styles.wrap}>
                    <AppText variant="label">{t("assessments.versions.version", { version: v.version })}</AppText>
                    <Badge tone={ASSESSMENT_STATUS_TONE[v.status]} label={t(`assessments.status.${v.status}`)} />
                  </View>
                  <AppText variant="caption" tone="mutedForeground">
                    {formatDate(locale, new Date(v.publishedAt ?? v.createdAt))}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function Heading({ icon, title, tone }: { icon: IconName; title: string; tone?: "warning" }) {
  return (
    <View style={styles.heading}>
      <IconTile icon={icon} size="sm" tone={tone} />
      <AppText variant="h4" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
    </View>
  );
}

function InfoRow({ icon, label, value, separator = false }: { icon: IconName; label: string; value: string; separator?: boolean }) {
  const { colors } = useTheme();
  return (
    <>
      {separator && <Separator />}
      <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <AppText variant="label" style={styles.flex}>
          {label}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground" style={styles.value}>
          {value}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch, paddingVertical: spacing[2] },
  value: { maxWidth: "55%", textAlign: "right" },
  issue: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  bullet: { marginTop: spacing[1.5] },
  linkCard: { paddingVertical: spacing[2] },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch, paddingVertical: spacing[2], borderRadius: radius.md },
  timelineRow: { flexDirection: "row", gap: spacing[3] },
  rail: { width: spacing[3], alignItems: "center" },
  dot: { width: spacing[3], height: spacing[3], borderRadius: radius.full, marginTop: spacing[1] },
  line: { flex: 1, width: 2, marginTop: spacing[1] },
  timelineBody: { flex: 1, gap: spacing[0.5], paddingBottom: spacing[4] },
});
