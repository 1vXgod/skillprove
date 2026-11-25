import { formatDate } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, EmptyState, Skeleton } from "../../components/ui";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { controlHeights, spacing } from "@skillprove/shared/design";

export default function AssessmentsScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <AssessmentsContent />
      </SignedInGate>
    </Screen>
  );
}

const tone = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" } as const;

/** Read-only: companies create and edit assessments on the website. */
function AssessmentsContent() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });
  const companyId = me.data?.companies[0]?.companyId ?? null;
  const list = useQuery({
    queryKey: queryKeys.assessments(companyId ?? ""),
    queryFn: () => client.listAssessments(companyId as string, { pageSize: 50 }),
    enabled: companyId !== null,
    retry: false,
  });

  const header = (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {t("assessments.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("assessments.mobile.readOnlyNotice")}</AppText>
    </View>
  );

  if (me.isPending || (companyId !== null && list.isPending)) {
    return (
      <View style={styles.gap} accessibilityLabel={t("common.loading")}>
        {header}
        <Skeleton height={96} />
        <Skeleton height={96} />
      </View>
    );
  }
  const failed = me.isError ? me : list.isError ? list : null;
  if (failed) {
    return (
      <View style={styles.gap}>
        {header}
        <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, failed.error)} />
        <Button label={t("common.tryAgain")} variant="outline" onPress={() => void failed.refetch()} />
      </View>
    );
  }
  if (!companyId) {
    return (
      <View style={styles.gap}>
        {header}
        <EmptyState title={t("assessments.noCompany")} />
      </View>
    );
  }
  const items = list.data?.items ?? [];
  return (
    <View style={styles.gap}>
      {header}
      {items.length === 0 ? (
        <EmptyState title={t("assessments.list.empty")} />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => router.push({ pathname: "/assessments/detail", params: { id: item.id } })}
            style={styles.touch}
          >
            <Card>
              <AppText variant="h4">{item.title}</AppText>
              <View style={styles.wrap}>
                <Badge tone={tone[item.status]} label={t(`assessments.status.${item.status}`)} />
                {item.assessmentType && <Badge label={t(`assessments.type.${item.assessmentType}`)} />}
              </View>
              <AppText variant="bodySmall" tone="mutedForeground">
                {t("assessments.list.questions", { count: item.questionCount })} · {t("assessments.list.version", { version: item.version })} ·{" "}
                {t("assessments.list.updated", { date: formatDate(locale, new Date(item.updatedAt)) })}
              </AppText>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  touch: { minHeight: controlHeights.touch },
});
