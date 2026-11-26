"use client";

import { takeableState, type TakeableState } from "@skillprove/shared";
import type { TakeableAssessment } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ClipboardIcon } from "../icons";
import { Alert, Badge, Button, Card, CardContent, Dialog, EmptyState, Skeleton, type Tone } from "../ui";

/**
 * Published public assessments the candidate can take (Milestone 7, slices 17 and 18, as slice 13
 * on mobile). An attempt in progress opens directly; a new one asks first, because starting it
 * starts the timer and uses an attempt.
 */
export function TakeableList() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });
  const [confirming, setConfirming] = useState<TakeableAssessment | null>(null);
  const start = useMutation({
    mutationFn: (assessmentId: string) => client.startAttempt(assessmentId),
    onSuccess: (attempt) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.takeable(locale) });
      queryClient.setQueryData(queryKeys.attempt(attempt.id), attempt);
      router.push(`/take/${encodeURIComponent(attempt.id)}`);
    },
  });

  function choose(item: TakeableAssessment) {
    const state = takeableState(item);
    if (state === "inProgress" && item.openAttemptId) router.push(`/take/${encodeURIComponent(item.openAttemptId)}`);
    else if (state === "available") {
      start.reset();
      setConfirming(item);
    }
  }

  if (list.isPending) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")} className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }
  if (list.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, list.error)}
          <Button size="sm" variant="outline" onClick={() => void list.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  if (list.data.items.length === 0) return <EmptyState icon={<ClipboardIcon size={20} />} title={t("take.empty")} />;
  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2">
        {list.data.items.map((item) => (
          <li key={item.assessmentId}>
            <TakeableCard item={item} onChoose={() => choose(item)} />
          </li>
        ))}
      </ul>
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && !start.isPending && setConfirming(null)}
        title={t("take.confirmTitle")}
        description={confirming ? t("take.confirmBody", { max: confirming.maxAttempts }) : undefined}
        footer={
          <>
            <Button variant="outline" disabled={start.isPending} onClick={() => setConfirming(null)}>
              {t("common.cancel")}
            </Button>
            <Button loading={start.isPending} onClick={() => confirming && start.mutate(confirming.assessmentId)}>
              {t("take.start")}
            </Button>
          </>
        }
      >
        {confirming?.durationMinutes ? <p className="type-body">{t("take.confirmDuration", { minutes: confirming.durationMinutes })}</p> : null}
        <p className="type-body">{t("take.confirmKeepsRunning")}</p>
        {start.isError && <Alert tone="error">{errorMessage(t, start.error)}</Alert>}
      </Dialog>
    </>
  );
}

const STATE_BADGES: Record<TakeableState, { tone: Tone; key: "take.inProgress" | "take.noAttemptsLeft" } | null> = {
  inProgress: { tone: "info", key: "take.inProgress" },
  noAttemptsLeft: { tone: "neutral", key: "take.noAttemptsLeft" },
  available: null,
};

function TakeableCard({ item, onChoose }: { item: TakeableAssessment; onChoose: () => void }) {
  const { t } = useI18n();
  const state = takeableState(item);
  const badge = STATE_BADGES[state];
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 pt-5">
        <h2 className="type-h4 text-foreground">{item.title}</h2>
        {item.description && <p className="type-body-small text-muted-foreground">{item.description}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge>{t(`passport.difficulty.${item.difficulty}`)}</Badge>
          {item.skills.map((skill) => (
            <Badge key={skill.skillId} tone="info">
              {skill.name}
            </Badge>
          ))}
          {badge && <Badge tone={badge.tone}>{t(badge.key)}</Badge>}
        </div>
        <p className="mt-auto type-body-small text-muted-foreground">
          {t("take.questions", { count: item.questionCount })} ·{" "}
          {item.durationMinutes ? t("take.minutes", { minutes: item.durationMinutes }) : t("take.noTimeLimit")} ·{" "}
          {t("take.attempts", { used: item.attemptsUsed, max: item.maxAttempts })}
        </p>
        {state !== "noAttemptsLeft" && (
          <div>
            <Button size="sm" variant={state === "inProgress" ? "outline" : "primary"} onClick={onChoose} aria-label={`${t(state === "inProgress" ? "take.continue" : "take.start")}: ${item.title}`}>
              {t(state === "inProgress" ? "take.continue" : "take.start")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
