"use client";

import type { AiJob } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { Alert, Button, buttonClasses, Card, CardContent, CardHeader, Progress, Spinner } from "../ui";
import { LoadError } from "./assessment-list";
import { failureReasonKey } from "./shared";

const POLL_MS = 2000;
const ACTIVE = new Set(["QUEUED", "RUNNING"]);

/**
 * Follows a generation job by polling. The browser never waits on the AI call itself: the API
 * answered with a job ID immediately and works in the background.
 */
export function GenerationProgress({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const job = useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: () => client.getJob(jobId),
    // Stops once the job reaches a final state, and slows down after repeated errors.
    refetchInterval: (query) => (query.state.data && !ACTIVE.has(query.state.data.status) ? false : POLL_MS),
    retry: 2,
  });
  const update = (next: AiJob) => queryClient.setQueryData(queryKeys.job(jobId), next);
  const cancel = useMutation({ mutationFn: () => client.cancelJob(jobId), onSuccess: update });
  const retry = useMutation({ mutationFn: () => client.retryJob(jobId), onSuccess: update });

  if (job.isPending) return <Spinner label={t("common.loading")} />;
  if (job.isError) return <LoadError message={errorMessage(t, job.error)} onRetry={() => void job.refetch()} />;

  const data = job.data;
  const status = data.status;
  const progress = status === "QUEUED" ? 15 : status === "RUNNING" ? 60 : 100;
  const reasonKey = failureReasonKey(data.errorCode);

  return (
    <Card className="max-w-2xl" data-testid="generation-progress" data-status={status}>
      <CardHeader title={t("assessments.generation.title")} />
      <CardContent className="flex flex-col gap-4 pt-4">
        <div aria-live="polite" className="flex flex-col gap-3">
          {ACTIVE.has(status) && <Progress value={progress} label={t("assessments.generation.title")} />}
          {status === "QUEUED" && <p>{t("assessments.generation.queued")}</p>}
          {status === "RUNNING" && <p>{t("assessments.generation.running")}</p>}
          {status === "SUCCEEDED" && <Alert tone="success">{t("assessments.generation.succeeded")}</Alert>}
          {status === "CANCELLED" && <Alert tone="info">{t("assessments.generation.cancelled")}</Alert>}
          {status === "FAILED" && (
            <Alert tone="error" title={t("assessments.generation.failed")}>
              {t(reasonKey)}
            </Alert>
          )}
        </div>
        {data.inputTokens !== null && data.outputTokens !== null && (
          <p className="type-caption text-muted-foreground">{t("assessments.generation.tokens", { input: data.inputTokens, output: data.outputTokens })}</p>
        )}
        {(cancel.isError || retry.isError) && <Alert tone="error">{errorMessage(t, cancel.error ?? retry.error)}</Alert>}
        <div className="flex flex-wrap gap-3">
          {ACTIVE.has(status) && (
            <Button variant="outline" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              {t("assessments.generation.cancel")}
            </Button>
          )}
          {status === "SUCCEEDED" && data.assessmentId && (
            <Link href={`/assessments/${data.assessmentId}`} className={buttonClasses({})}>
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
      </CardContent>
    </Card>
  );
}
