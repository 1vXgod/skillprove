import { Feather } from "@expo/vector-icons";
import { ASSESSMENT_STATUS_TONE, ASSESSMENT_STATUSES, type AssessmentStatus } from "@skillprove/shared";
import { controlHeights, radius, spacing } from "@skillprove/shared/design";
import { formatDate } from "@skillprove/shared/i18n";
import type { AssessmentListItem } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { STATUS_TILE } from "../../components/assessment-status";
import { QueryState } from "../../components/query-state";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Card, Chip, ChipGroup, EmptyState, IconTile } from "../../components/ui";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n, useTheme } from "../../theme/preferences-provider";

export default function AssessmentsScreen() {
  return (
    <Screen>
      <SignedInGate>
        <AssessmentsContent />
      </SignedInGate>
    </Screen>
  );
}

/** Read-only: companies create and edit assessments on the website. */
function AssessmentsContent() {
  const { t } = useI18n();
  const client = useApiClient();
  const [status, setStatus] = useState<AssessmentStatus | "">("");
  const me = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });
  const companyId = me.data?.companies[0]?.companyId ?? null;
  const list = useQuery({
    queryKey: [...queryKeys.assessments(companyId ?? ""), status],
    queryFn: () => client.listAssessments(companyId as string, { pageSize: 50, status: status || undefined }),
    enabled: companyId !== null,
    retry: false,
  });

  const header = (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {t("assessments.title")}
      </AppText>
      <Alert tone="info" message={t("assessments.mobile.readOnlyNotice")} />
    </View>
  );
  const filter = (
    <ChipGroup
      label={t("assessments.list.filterStatus")}
      value={status}
      onChange={setStatus}
      options={[{ value: "" as const, label: t("assessments.list.filterAll") }, ...ASSESSMENT_STATUSES.map((s) => ({ value: s, label: t(`assessments.status.${s}`) }))]}
    />
  );

  if (!me.isSuccess) return <QueryState query={me} skeleton={[96, 96]} header={header} />;
  if (!companyId) {
    return (
      <View style={styles.gap}>
        {header}
        <EmptyState icon="clipboard" title={t("assessments.noCompany")} />
      </View>
    );
  }
  return (
    <View style={styles.gap}>
      {header}
      {filter}
      {!list.isSuccess ? (
        <QueryState query={list} skeleton={[120, 120]} />
      ) : list.data.items.length === 0 ? (
        <Card>
          <EmptyState icon="clipboard" title={t("assessments.list.empty")} />
        </Card>
      ) : (
        list.data.items.map((item) => <AssessmentCard key={item.id} item={item} />)
      )}
    </View>
  );
}

function AssessmentCard({ item }: { item: AssessmentListItem }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const tile = STATUS_TILE[item.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${t(`assessments.status.${item.status}`)}`}
      onPress={() => router.push({ pathname: "/assessments/detail", params: { id: item.id } })}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Card>
        <View style={styles.cardRow}>
          <IconTile icon={tile.icon} tone={tile.tone} />
          <View style={styles.body}>
            <AppText variant="h4">{item.title}</AppText>
            <View style={styles.wrap}>
              <Badge tone={ASSESSMENT_STATUS_TONE[item.status]} label={t(`assessments.status.${item.status}`)} />
              {item.assessmentType && <Chip label={t(`assessments.type.${item.assessmentType}`)} />}
              <Chip icon={item.creationSource === "AI_GENERATED" ? "zap" : undefined} label={t(`assessments.source.${item.creationSource}`)} />
            </View>
            <AppText variant="bodySmall" tone="mutedForeground">
              {t("assessments.list.questions", { count: item.questionCount })} · {t("assessments.list.version", { version: item.version })} ·{" "}
              {t("assessments.list.updated", { date: formatDate(locale, new Date(item.updatedAt)) })}
            </AppText>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={styles.chevron} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  touch: { minHeight: controlHeights.touch, borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  body: { flex: 1, gap: spacing[2] },
  chevron: { alignSelf: "center" },
});
