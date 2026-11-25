import { controlHeights, spacing } from "@skillprove/shared/design";
import type { TakeableAssessment } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, EmptyState, Skeleton, type Tone } from "../../components/ui";
import { takeableState, type TakeableState } from "../../lib/takeable";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

export default function TakeAssessmentsScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <TakeableList />
      </SignedInGate>
    </Screen>
  );
}

/**
 * Published public assessments the candidate can take (Milestone 7, slice 13). Browsing only:
 * starting an attempt is the Take screen (slice 14), so the cards are not tappable yet.
 */
function TakeableList() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const list = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });

  const header = (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {t("take.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("take.description")}</AppText>
    </View>
  );

  if (list.isPending) {
    return (
      <View style={styles.gap} accessibilityLabel={t("common.loading")}>
        {header}
        <Skeleton height={112} />
        <Skeleton height={112} />
      </View>
    );
  }
  if (list.isError) {
    return (
      <View style={styles.gap}>
        {header}
        <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, list.error)} />
        <Button label={t("common.tryAgain")} variant="outline" onPress={() => void list.refetch()} />
      </View>
    );
  }

  const items = list.data.items;
  return (
    <View style={styles.gap}>
      {header}
      {items.length === 0 ? <EmptyState title={t("take.empty")} /> : items.map((item) => <TakeableCard key={item.assessmentId} item={item} />)}
    </View>
  );
}

const stateBadge: Record<TakeableState, { tone: Tone; key: "take.inProgress" | "take.noAttemptsLeft" } | null> = {
  inProgress: { tone: "info", key: "take.inProgress" },
  noAttemptsLeft: { tone: "neutral", key: "take.noAttemptsLeft" },
  available: null,
};

function TakeableCard({ item }: { item: TakeableAssessment }) {
  const { t } = useI18n();
  const badge = stateBadge[takeableState(item)];
  return (
    <Card style={styles.card} accessibilityLabel={item.title}>
      <AppText variant="h4">{item.title}</AppText>
      {item.description && <AppText tone="mutedForeground">{item.description}</AppText>}
      <View style={styles.wrap}>
        <Badge label={t(`passport.difficulty.${item.difficulty}`)} />
        {item.skills.map((skill) => (
          <Badge key={skill.skillId} tone="info" label={skill.name} />
        ))}
        {badge && <Badge tone={badge.tone} label={t(badge.key)} />}
      </View>
      <AppText variant="bodySmall" tone="mutedForeground">
        {t("take.questions", { count: item.questionCount })} ·{" "}
        {item.durationMinutes ? t("take.minutes", { minutes: item.durationMinutes }) : t("take.noTimeLimit")} ·{" "}
        {t("take.attempts", { used: item.attemptsUsed, max: item.maxAttempts })}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  card: { minHeight: controlHeights.touch, gap: spacing[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});
