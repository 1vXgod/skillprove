import { controlHeights, spacing } from "@skillprove/shared/design";
import type { TakeableAssessment } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, EmptyState, Modal, Skeleton, type Tone } from "../../components/ui";
import { takeableState, type TakeableState } from "@skillprove/shared";
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

const openAttempt = (attemptId: string) => router.push({ pathname: "/take/attempt", params: { attemptId } });

/**
 * Published public assessments the candidate can take. An attempt in progress opens directly;
 * a new one asks first, because starting it starts the timer and uses an attempt.
 */
function TakeableList() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });
  const [confirming, setConfirming] = useState<TakeableAssessment | null>(null);
  const start = useMutation({
    mutationFn: (assessmentId: string) => client.startAttempt(assessmentId),
    onSuccess: (attempt) => {
      setConfirming(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.takeable(locale) });
      openAttempt(attempt.id);
    },
  });

  function choose(item: TakeableAssessment) {
    const state = takeableState(item);
    if (state === "inProgress" && item.openAttemptId) openAttempt(item.openAttemptId);
    else if (state === "available") {
      start.reset();
      setConfirming(item);
    }
  }

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
      {items.length === 0 ? (
        <EmptyState title={t("take.empty")} />
      ) : (
        items.map((item) => <TakeableCard key={item.assessmentId} item={item} onPress={() => choose(item)} />)
      )}
      <Modal
        visible={confirming !== null}
        onClose={() => setConfirming(null)}
        dismissible={false}
        title={t("take.confirmTitle")}
        description={confirming ? t("take.confirmBody", { max: confirming.maxAttempts }) : undefined}
        footer={
          <View style={styles.gap}>
            <Button label={t("take.start")} loading={start.isPending} onPress={() => confirming && start.mutate(confirming.assessmentId)} fullWidth />
            <Button label={t("common.cancel")} variant="outline" disabled={start.isPending} onPress={() => setConfirming(null)} fullWidth />
          </View>
        }
      >
        {confirming?.durationMinutes ? <AppText>{t("take.confirmDuration", { minutes: confirming.durationMinutes })}</AppText> : null}
        <AppText>{t("take.confirmKeepsRunning")}</AppText>
        {start.isError && <Alert tone="error" message={errorMessage(t, start.error)} />}
      </Modal>
    </View>
  );
}

const stateBadge: Record<TakeableState, { tone: Tone; key: "take.inProgress" | "take.noAttemptsLeft" } | null> = {
  inProgress: { tone: "info", key: "take.inProgress" },
  noAttemptsLeft: { tone: "neutral", key: "take.noAttemptsLeft" },
  available: null,
};

function TakeableCard({ item, onPress }: { item: TakeableAssessment; onPress: () => void }) {
  const { t } = useI18n();
  const state = takeableState(item);
  const badge = stateBadge[state];
  const card = (
    <Card style={styles.card}>
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
  if (state === "noAttemptsLeft") return <View accessibilityLabel={item.title}>{card}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={t(state === "inProgress" ? "take.continue" : "take.start")}
      onPress={onPress}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  card: { minHeight: controlHeights.touch, gap: spacing[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});
