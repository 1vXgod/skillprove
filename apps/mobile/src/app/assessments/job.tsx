import { isJobActive, JOB_STEPS, jobStepStates, type JobStepState } from "@skillprove/shared";
import { spacing } from "@skillprove/shared/design";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OfflineNotice, QueryState } from "../../components/query-state";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Button, Card, IconTile, Stepper } from "../../components/ui";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

export default function GenerationStatusScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <JobContent />
      </SignedInGate>
    </Screen>
  );
}

const REASONS = ["provider_timeout", "provider_unavailable", "provider_rate_limited", "provider_blocked", "provider_misconfigured", "invalid_output", "timeout", "internal", "invalid_job"] as const;

/**
 * Follows a generation job by polling. Starting, retrying and cancelling happen on the website.
 * The stepper shows only the states the job reports; there is no estimated percentage.
 */
function JobContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const client = useApiClient();
  const job = useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => client.getJob(id),
    refetchInterval: (query) => (query.state.data && !isJobActive(query.state.data.status) ? false : 2000),
    retry: 2,
  });

  if (!job.isSuccess) return <QueryState query={job} skeleton={[160]} />;
  const data = job.data;
  const reason = REASONS.find((r) => r === data.errorCode) ?? "internal";
  const states = jobStepStates(data.status);
  const ended = (state: JobStepState): state is "failed" | "cancelled" => state === "failed" || state === "cancelled";
  return (
    <Card>
      <View style={styles.heading}>
        <IconTile icon="zap" />
        <AppText variant="h3" accessibilityRole="header" style={styles.flex}>
          {t("assessments.generation.title")}
        </AppText>
      </View>
      <Stepper
        steps={JOB_STEPS.map((step) => {
          const state = states[step];
          return {
            key: step,
            label: ended(state) ? t(`assessments.generation.steps.${state}`) : t(`assessments.generation.steps.${step}`),
            state,
            stateLabel: ended(state) ? t(`assessments.generation.steps.${state}`) : t(`assessments.generation.stepState.${state}`),
          };
        })}
      />
      <View style={styles.gap} accessibilityLiveRegion="polite">
        {/* Checking the job again waits for the connection. */}
        <OfflineNotice visible={job.fetchStatus === "paused"} />
        {data.status === "QUEUED" && <AppText tone="mutedForeground">{t("assessments.generation.queued")}</AppText>}
        {data.status === "RUNNING" && <AppText tone="mutedForeground">{t("assessments.generation.running")}</AppText>}
        {data.status === "SUCCEEDED" && <Alert tone="success" message={t("assessments.generation.succeeded")} />}
        {data.status === "CANCELLED" && <Alert tone="info" message={t("assessments.generation.cancelled")} />}
        {data.status === "FAILED" && <Alert tone="error" title={t("assessments.generation.failed")} message={t(`assessments.generation.reason.${reason}`)} />}
      </View>
      {data.status === "SUCCEEDED" && data.assessmentId && (
        <Button label={t("assessments.generation.openDraft")} variant="glow" onPress={() => router.push({ pathname: "/assessments/detail", params: { id: data.assessmentId as string } })} fullWidth />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  flex: { flex: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
});
