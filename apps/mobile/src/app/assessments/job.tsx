import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Button, Card, CardHeader, Progress } from "../../components/ui";
import { OfflineNotice, QueryState } from "../../components/query-state";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { spacing } from "@skillprove/shared/design";

export default function GenerationStatusScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <JobContent />
      </SignedInGate>
    </Screen>
  );
}

const ACTIVE = ["QUEUED", "RUNNING"];
const REASONS = ["provider_timeout", "provider_unavailable", "provider_rate_limited", "provider_blocked", "provider_misconfigured", "invalid_output", "timeout", "internal", "invalid_job"] as const;

/** Follows a generation job by polling. Starting, retrying and cancelling happen on the website. */
function JobContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const client = useApiClient();
  const job = useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => client.getJob(id),
    refetchInterval: (query) => (query.state.data && !ACTIVE.includes(query.state.data.status) ? false : 2000),
    retry: 2,
  });

  if (!job.isSuccess) return <QueryState query={job} skeleton={[160]} />;
  const data = job.data;
  const reason = REASONS.find((r) => r === data.errorCode) ?? "internal";
  return (
    <Card>
      <CardHeader title={t("assessments.generation.title")} />
      <View style={styles.gap} accessibilityLiveRegion="polite">
        {/* Checking the job again waits for the connection. */}
        <OfflineNotice visible={job.fetchStatus === "paused"} />
        {ACTIVE.includes(data.status) && <Progress value={data.status === "QUEUED" ? 15 : 60} label={t("assessments.generation.title")} />}
        {data.status === "QUEUED" && <AppText>{t("assessments.generation.queued")}</AppText>}
        {data.status === "RUNNING" && <AppText>{t("assessments.generation.running")}</AppText>}
        {data.status === "SUCCEEDED" && <Alert tone="success" message={t("assessments.generation.succeeded")} />}
        {data.status === "CANCELLED" && <Alert tone="info" message={t("assessments.generation.cancelled")} />}
        {data.status === "FAILED" && <Alert tone="error" title={t("assessments.generation.failed")} message={t(`assessments.generation.reason.${reason}`)} />}
      </View>
      {data.status === "SUCCEEDED" && data.assessmentId && (
        <Button label={t("assessments.generation.openDraft")} onPress={() => router.push({ pathname: "/assessments/detail", params: { id: data.assessmentId as string } })} fullWidth />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({ gap: { gap: spacing[4] } });
