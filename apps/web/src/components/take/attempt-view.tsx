"use client";

import { answersToSubmit, formatCountdown, isAnswered, secondsLeft, toggleChoice, unansweredCount, type Answers } from "@skillprove/assessment-engine";
import { ApiClientError } from "@skillprove/api-client";
import type { AttemptAnswer, AttemptQuestion, CandidateAttempt } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAnswers, loadAnswers, saveAnswers } from "../../lib/attempt-store";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ChevronLeftIcon, ChevronRightIcon, ClipboardIcon } from "../icons";
import { Alert, Badge, Button, buttonClasses, Card, CardContent, Checkbox, Dialog, EmptyState, Progress, Radio, RadioGroup, Skeleton } from "../ui";

/**
 * Taking an attempt on the web (Milestone 7, slice 18), as slice 14 on mobile. The attempt is
 * started from the list, which asks first; this screen only shows an attempt that exists.
 */
export function AttemptView({ attemptId }: { attemptId: string }) {
  const { t } = useI18n();
  const client = useApiClient();
  const attempt = useQuery({
    queryKey: queryKeys.attempt(attemptId),
    queryFn: () => client.getAttempt(attemptId),
    retry: false,
    // The questions do not change during an attempt.
    staleTime: Infinity,
  });

  if (attempt.isPending) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (attempt.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, attempt.error)}
          <Button size="sm" variant="outline" onClick={() => void attempt.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  if (attempt.data.status !== "IN_PROGRESS") return <Finished attempt={attempt.data} />;
  return <Taking attempt={attempt.data} />;
}

/** A submitted or expired attempt. The result screen is slice 19. */
function Finished({ attempt }: { attempt: CandidateAttempt }) {
  const { t } = useI18n();
  // Answers saved in the browser are no use once the attempt is closed.
  useEffect(() => clearAnswers(attempt.id), [attempt.id]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="type-h1 text-foreground">{attempt.title}</h1>
      <EmptyState
        icon={<ClipboardIcon size={20} />}
        title={t("take.finishedTitle")}
        description={attempt.status === "EXPIRED" ? t("errors.attemptExpired") : undefined}
        action={
          <Link href="/take" className={buttonClasses()}>
            {t("take.backToList")}
          </Link>
        }
      />
    </div>
  );
}

/** The current time, updated every second, for the countdown. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * One question per screen, then a review, then submit. Answers stay in the browser (saved after
 * every change) until submit. The countdown runs to the server's deadline on this computer's
 * clock; the server alone decides, and accepts a submit for 30 seconds after the deadline.
 */
function Taking({ attempt }: { attempt: CandidateAttempt }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const questions = attempt.questions;
  // Only rendered in the browser (the attempt is fetched there), so storage can be read at once.
  const [answers, setAnswers] = useState<Answers>(() => loadAnswers(attempt.id, questions));
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const left = secondsLeft(attempt.expiresAt, useNow());

  useEffect(() => saveAnswers(attempt.id, questions, answers), [attempt.id, questions, answers]);

  const submit = useMutation({
    mutationFn: () => client.submitAttempt(attempt.id, answersToSubmit(answers)),
    onSuccess: (submitted) => {
      clearAnswers(attempt.id);
      setConfirming(false);
      queryClient.setQueryData(queryKeys.attempt(attempt.id), submitted);
      void queryClient.invalidateQueries({ queryKey: queryKeys.takeable(locale) });
    },
    onError: (error) => {
      setConfirming(false);
      // Expired or already submitted: nothing to retry, so show the attempt as it now is.
      if (error instanceof ApiClientError && (error.code === "ATTEMPT_EXPIRED" || error.code === "CONFLICT")) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.attempt(attempt.id) });
      }
    },
  });

  // When time runs out, send what there is. The server's grace period covers the delay.
  if (left === 0 && !timeUp) setTimeUp(true);
  const { mutate: send } = submit;
  useEffect(() => {
    if (timeUp) send();
  }, [timeUp, send]);

  const answer = (questionId: string, value: AttemptAnswer) => setAnswers((current) => ({ ...current, [questionId]: value }));
  const unanswered = unansweredCount(questions, answers);
  const questionOf = (i: number) => t("take.questionOf", { current: i + 1, total: questions.length });

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="type-h2 text-foreground">{attempt.title}</h1>
        {left !== null && (
          <div role="timer" aria-label={t("take.timeLeft", { time: formatCountdown(left) })} aria-live={left <= 60 ? "polite" : "off"}>
            <Badge tone={left <= 60 ? "warning" : "neutral"} className="type-label tabular-nums">
              {formatCountdown(left)}
            </Badge>
          </div>
        )}
      </div>
      {timeUp && submit.isPending && <Alert tone="info">{t("take.timeUp")}</Alert>}
      {submit.isError && <Alert tone="error">{errorMessage(t, submit.error)}</Alert>}
    </div>
  );

  const confirm = (
    <Dialog
      open={confirming}
      onOpenChange={(open) => !submit.isPending && setConfirming(open)}
      title={t("take.submitConfirmTitle")}
      description={t("take.submitConfirmBody")}
      footer={
        <>
          <Button variant="outline" disabled={submit.isPending} onClick={() => setConfirming(false)}>
            {t("common.cancel")}
          </Button>
          <Button loading={submit.isPending} onClick={() => send()}>
            {t("take.submit")}
          </Button>
        </>
      }
    >
      {unanswered > 0 && <Alert tone="warning">{t("take.submitUnanswered", { count: unanswered })}</Alert>}
    </Dialog>
  );

  if (reviewing) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {header}
        <div className="flex flex-col gap-1">
          <h2 className="type-h3 text-foreground">{t("take.reviewTitle")}</h2>
          <p className="type-body text-muted-foreground">{t("take.reviewBody")}</p>
        </div>
        <ol className="flex flex-col gap-2">
          {questions.map((q, i) => {
            const done = isAnswered(answers[q.id]);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setReviewing(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-label text-foreground">{questionOf(i)}</span>
                    <span className="type-body-small line-clamp-2 text-muted-foreground">{q.prompt}</span>
                  </span>
                  <Badge tone={done ? "success" : "warning"}>{t(done ? "take.answered" : "take.notAnswered")}</Badge>
                </button>
              </li>
            );
          })}
        </ol>
        <div>
          <Button disabled={submit.isPending} onClick={() => setConfirming(true)}>
            {t("take.submit")}
          </Button>
        </div>
        {confirm}
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const last = index === questions.length - 1;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {header}
      <Progress value={((index + 1) / questions.length) * 100} label={questionOf(index)} />
      <Card>
        <CardContent className="pt-6">
          <QuestionView key={question.id} question={question} value={answers[question.id]} label={questionOf(index)} onAnswer={(value) => answer(question.id, value)} />
        </CardContent>
      </Card>
      <div className="flex justify-between gap-3">
        <Button variant="outline" icon={<ChevronLeftIcon size={16} />} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          {t("take.previous")}
        </Button>
        {last ? (
          <Button onClick={() => setReviewing(true)}>{t("take.review")}</Button>
        ) : (
          <Button onClick={() => setIndex(index + 1)}>
            {t("take.next")}
            <ChevronRightIcon size={16} />
          </Button>
        )}
      </div>
      {confirm}
    </div>
  );
}

function QuestionView({ question, value, label, onAnswer }: { question: AttemptQuestion; value: AttemptAnswer | undefined; label: string; onAnswer: (value: AttemptAnswer) => void }) {
  const { t } = useI18n();
  const name = `q-${question.id}`;
  const prompt = (
    <div className="flex flex-col gap-1">
      <p className="type-label text-muted-foreground">{label}</p>
      <h2 className="type-h3 text-foreground">{question.prompt}</h2>
      <p className="type-body-small text-muted-foreground">{t(question.kind === "multiple_select" ? "take.selectAll" : "take.selectOne")}</p>
    </div>
  );
  switch (question.kind) {
    case "multiple_choice":
      return (
        <div className="flex flex-col gap-4">
          {prompt}
          <RadioGroup legend={question.prompt} className="[&>legend]:sr-only">
            {question.choices.map((c) => (
              <Radio key={c.id} name={name} label={c.text} checked={value === c.id} onChange={() => onAnswer(c.id)} />
            ))}
          </RadioGroup>
        </div>
      );
    case "true_false":
      return (
        <div className="flex flex-col gap-4">
          {prompt}
          <RadioGroup legend={question.prompt} className="[&>legend]:sr-only">
            <Radio name={name} label={t("take.answerTrue")} checked={value === true} onChange={() => onAnswer(true)} />
            <Radio name={name} label={t("take.answerFalse")} checked={value === false} onChange={() => onAnswer(false)} />
          </RadioGroup>
        </div>
      );
    case "multiple_select":
      return (
        <div className="flex flex-col gap-4">
          {prompt}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">{question.prompt}</legend>
            {question.choices.map((c) => (
              <Checkbox
                key={c.id}
                label={c.text}
                checked={Array.isArray(value) && value.includes(c.id)}
                onChange={() => onAnswer(toggleChoice(question, value, c.id))}
              />
            ))}
          </fieldset>
        </div>
      );
  }
}
