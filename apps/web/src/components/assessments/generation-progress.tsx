"use client";

import { isJobActive, JOB_STEPS, jobStepStates, type JobStepState } from "@skillprove/shared";
import type { AiJob } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { SparkleIcon } from "../icons";
import { Alert, Button, buttonClasses, Card, CardContent, IconTile, Spinner, Stepper } from "../ui";
import { LoadError } from "./assessment-list";
import { failureReasonKey } from "./shared";

const POLL_MS = 2000;

/**
 * Follows a generation job by polling. The browser never waits on the AI call itself: the API
 * answered with a job ID immediately and works in the background. The stepper shows only the
 * states the job reports; there is no estimated percentage.
 */
export function GenerationProgress({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const job = useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: () => client.getJob(jobId),
    // Stops once the job reaches a final state, and slows down after repeated errors.
    refetchInterval: (query) => (query.state.data && !isJobActive(query.state.data.status) ? false : POLL_MS),
    retry: 2,
  });
  const update = (next: AiJob) => queryClient.setQueryData(queryKeys.job(jobId), next);
  const cancel = useMutation({ mutationFn: () => client.cancelJob(jobId), onSuccess: update });
  const retry = useMutation({ mutationFn: () => client.retryJob(jobId), onSuccess: update });

  if (job.isPending) return <Spinner label={t("common.loading")} />;
  if (job.isError) return <LoadError message={errorMessage(t, job.error)} onRetry={() => void job.refetch()} />;

  const data = job.data;
  const status = data.status;
  const states = jobStepStates(status);
  const stepLabel = (step: (typeof JOB_STEPS)[number], state: JobStepState) =>
    step === "ready" && (state === "failed" || state === "cancelled") ? t(`assessments.generation.steps.${state}`) : t(`assessments.generation.steps.${step}`);
  const stateLabel = (state: JobStepState) => (state === "failed" || state === "cancelled" ? t(`assessments.generation.steps.${state}`) : t(`assessments.generation.stepState.${state}`));

  return (
    <Card className="max-w-2xl" data-testid="generation-progress" data-status={status}>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <IconTile icon={<SparkleIcon size={20} />} />
          <h1 className="type-h3 text-foreground">{t("assessments.generation.title")}</h1>
        </div>

        <Stepper steps={JOB_STEPS.map((step) => ({ key: step, label: stepLabel(step, states[step]), state: states[step], stateLabel: stateLabel(states[step]) }))} />

        <div aria-live="polite" className="flex flex-col gap-3">
          {status === "QUEUED" && <p className="type-body text-muted-foreground">{t("assessments.generation.queued")}</p>}
          {status === "RUNNING" && <p className="type-body text-muted-foreground">{t("assessments.generation.running")}</p>}
          {status === "SUCCEEDED" && <Alert tone="success">{t("assessments.generation.succeeded")}</Alert>}
          {status === "CANCELLED" && <Alert tone="info">{t("assessments.generation.cancelled")}</Alert>}
          {status === "FAILED" && (
            <Alert tone="error" title={t("assessments.generation.failed")}>
              {t(failureReasonKey(data.errorCode))}
            </Alert>
          )}
        </div>

        {(cancel.isError || retry.isError) && <Alert tone="error">{errorMessage(t, cancel.error ?? retry.error)}</Alert>}

        <div className="flex flex-wrap gap-3">
          {isJobActive(status) && (
            <Button variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              {t("assessments.generation.cancel")}
            </Button>
          )}
          {status === "SUCCEEDED" && data.assessmentId && (
            <Link href={`/assessments/${data.assessmentId}`} className={buttonClasses({ variant: "glow" })}>
              {t("assessments.generation.openDraft")}
            </Link>
          )}
          {status === "FAILED" && (
            <>
              <Button loading={retry.isPending} onClick={() => retry.mutate()}>
                {t("assessments.generation.retry")}
              </Button>
              <Link href="/assessments/new" className={buttonClasses({ variant: "outline" })}>
                {t("assessments.generation.createManual")}
              </Link>
            </>
          )}
        </div>

        {data.inputTokens !== null && data.outputTokens !== null && (
          <p className="border-t border-border pt-4 type-caption text-muted-foreground">{t("assessments.generation.tokens", { input: data.inputTokens, output: data.outputTokens })}</p>
        )}
      </CardContent>
    </Card>
  );
}
