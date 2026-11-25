import { ApiClientError } from "@skillprove/api-client";
import { controlHeights, spacing } from "@skillprove/shared/design";
import type { AttemptAnswer, AttemptQuestion, CandidateAttempt } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, Checkbox, EmptyState, Modal, Progress, RadioGroup, Skeleton } from "../../components/ui";
import { answersToSubmit, formatCountdown, isAnswered, secondsLeft, toggleChoice, unansweredCount, type Answers } from "../../lib/attempt";
import { clearAnswers, loadAnswers, saveAnswers } from "../../lib/attempt-store";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

export default function AttemptScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <AttemptContent />
      </SignedInGate>
    </Screen>
  );
}

const backToList = () => router.replace("/take");

function AttemptContent() {
  const { t } = useI18n();
  const client = useApiClient();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const attempt = useQuery({
    queryKey: queryKeys.attempt(attemptId ?? ""),
    queryFn: () => client.getAttempt(attemptId as string),
    enabled: Boolean(attemptId),
    retry: false,
    // The questions do not change during an attempt; refetching would only cost data.
    staleTime: Infinity,
  });

  if (attempt.isPending) {
    return (
      <View style={styles.gap} accessibilityLabel={t("common.loading")}>
        <Skeleton height={32} />
        <Skeleton height={160} />
      </View>
    );
  }
  if (attempt.isError) {
    return (
      <View style={styles.gap}>
        <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, attempt.error)} />
        <Button label={t("common.tryAgain")} variant="outline" onPress={() => void attempt.refetch()} />
      </View>
    );
  }
  if (attempt.data.status !== "IN_PROGRESS") return <Finished attempt={attempt.data} />;
  return <Taking attempt={attempt.data} />;
}

function Finished({ attempt }: { attempt: CandidateAttempt }) {
  const { t } = useI18n();
  // Answers saved on the phone are no use once the attempt is closed.
  useEffect(() => {
    void clearAnswers(attempt.id);
  }, [attempt.id]);
  const [title, body] =
    attempt.status === "SUBMITTED"
      ? [t("take.submittedTitle"), t("take.submittedBody")]
      : attempt.status === "EXPIRED"
        ? [t("take.finishedTitle"), t("errors.attemptExpired")]
        : [t("take.finishedTitle"), undefined];
  return (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {attempt.title}
      </AppText>
      <EmptyState title={title} description={body} />
      <Button label={t("take.backToList")} onPress={backToList} fullWidth />
    </View>
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
 * Taking an attempt: one question per screen, then a review, then submit. Answers stay on the
 * phone (saved to its secure store after every change) until submit. The countdown runs to the
 * server's deadline using the phone's clock, so a wrong phone clock shows the wrong time; the
 * server alone decides, and still accepts a submit for 30 seconds after the deadline.
 */
function Taking({ attempt }: { attempt: CandidateAttempt }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const questions = attempt.questions;
  const [answers, setAnswers] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const autoSubmitted = useRef(false);
  const left = secondsLeft(attempt.expiresAt, useNow());

  useEffect(() => {
    let active = true;
    void loadAnswers(attempt.id, questions).then((saved) => {
      if (!active) return;
      setAnswers(saved);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [attempt.id, questions]);

  useEffect(() => {
    if (loaded) void saveAnswers(attempt.id, questions, answers);
  }, [loaded, attempt.id, questions, answers]);

  const submit = useMutation({
    mutationFn: () => client.submitAttempt(attempt.id, answersToSubmit(answers)),
    onSuccess: (submitted) => {
      void clearAnswers(attempt.id);
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
  useEffect(() => {
    if (left === 0 && loaded && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit.mutate();
    }
  }, [left, loaded, submit]);

  const answer = (questionId: string, value: AttemptAnswer) => setAnswers((current) => ({ ...current, [questionId]: value }));

  if (!loaded) return <Skeleton height={160} />;

  const header = (
    <View style={styles.gap}>
      <View style={styles.headerRow}>
        <AppText variant="h4" style={styles.flex}>
          {attempt.title}
        </AppText>
        {left !== null && (
          <View accessibilityLabel={t("take.timeLeft", { time: formatCountdown(left) })} accessibilityLiveRegion={left <= 60 ? "polite" : "none"}>
            <Badge tone={left <= 60 ? "warning" : "neutral"} label={formatCountdown(left)} />
          </View>
        )}
      </View>
      {autoSubmitted.current && submit.isPending && <Alert tone="info" message={t("take.timeUp")} />}
      {submit.isError && <Alert tone="error" message={errorMessage(t, submit.error)} />}
    </View>
  );

  const confirm = (
    <Modal
      visible={confirming}
      onClose={() => setConfirming(false)}
      dismissible={false}
      title={t("take.submitConfirmTitle")}
      description={t("take.submitConfirmBody")}
      footer={
        <View style={styles.gap}>
          <Button label={t("take.submit")} loading={submit.isPending} onPress={() => submit.mutate()} fullWidth />
          <Button label={t("common.cancel")} variant="outline" disabled={submit.isPending} onPress={() => setConfirming(false)} fullWidth />
        </View>
      }
    >
      {unansweredCount(questions, answers) > 0 && <Alert tone="warning" message={t("take.submitUnanswered", { count: unansweredCount(questions, answers) })} />}
    </Modal>
  );

  if (reviewing) {
    return (
      <View style={styles.gap}>
        {header}
        <AppText variant="h2" accessibilityRole="header">
          {t("take.reviewTitle")}
        </AppText>
        <AppText tone="mutedForeground">{t("take.reviewBody")}</AppText>
        {questions.map((q, i) => {
          const done = isAnswered(answers[q.id]);
          return (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={`${t("take.questionOf", { current: i + 1, total: questions.length })}, ${t(done ? "take.answered" : "take.notAnswered")}`}
              onPress={() => {
                setIndex(i);
                setReviewing(false);
              }}
            >
              <Card style={styles.reviewRow}>
                <View style={styles.flex}>
                  <AppText variant="label">{t("take.questionOf", { current: i + 1, total: questions.length })}</AppText>
                  <AppText variant="bodySmall" tone="mutedForeground" numberOfLines={2}>
                    {q.prompt}
                  </AppText>
                </View>
                <Badge tone={done ? "success" : "warning"} label={t(done ? "take.answered" : "take.notAnswered")} />
              </Card>
            </Pressable>
          );
        })}
        <Button label={t("take.submit")} disabled={submit.isPending} onPress={() => setConfirming(true)} fullWidth />
        {confirm}
      </View>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const last = index === questions.length - 1;
  return (
    <View style={styles.gap}>
      {header}
      <Progress value={((index + 1) / questions.length) * 100} label={t("take.questionOf", { current: index + 1, total: questions.length })} />
      <AppText variant="label" tone="mutedForeground">
        {t("take.questionOf", { current: index + 1, total: questions.length })}
      </AppText>
      <QuestionView question={question} value={answers[question.id]} onAnswer={(value) => answer(question.id, value)} />
      <View style={styles.navRow}>
        <View style={styles.flex}>
          <Button label={t("take.previous")} variant="outline" icon="arrow-left" disabled={index === 0} onPress={() => setIndex(index - 1)} fullWidth />
        </View>
        <View style={styles.flex}>
          {last ? (
            <Button label={t("take.review")} onPress={() => setReviewing(true)} fullWidth />
          ) : (
            <Button label={t("take.next")} icon="arrow-right" onPress={() => setIndex(index + 1)} fullWidth />
          )}
        </View>
      </View>
      {confirm}
    </View>
  );
}

function QuestionView({ question, value, onAnswer }: { question: AttemptQuestion; value: AttemptAnswer | undefined; onAnswer: (value: AttemptAnswer) => void }) {
  const { t } = useI18n();
  const prompt = (
    <AppText variant="h3" accessibilityRole="header">
      {question.prompt}
    </AppText>
  );
  switch (question.kind) {
    case "multiple_choice":
      return (
        <View style={styles.gap}>
          {prompt}
          <AppText tone="mutedForeground">{t("take.selectOne")}</AppText>
          <RadioGroup
            label={question.prompt}
            options={question.choices.map((c) => ({ value: c.id, label: c.text }))}
            value={typeof value === "string" ? value : ""}
            onChange={(choiceId) => onAnswer(choiceId)}
          />
        </View>
      );
    case "true_false":
      return (
        <View style={styles.gap}>
          {prompt}
          <AppText tone="mutedForeground">{t("take.selectOne")}</AppText>
          <RadioGroup
            label={question.prompt}
            options={[
              { value: "true", label: t("take.answerTrue") },
              { value: "false", label: t("take.answerFalse") },
            ]}
            value={typeof value === "boolean" ? String(value) : ""}
            onChange={(choice) => onAnswer(choice === "true")}
          />
        </View>
      );
    case "multiple_select":
      return (
        <View style={styles.gap}>
          {prompt}
          <AppText tone="mutedForeground">{t("take.selectAll")}</AppText>
          {question.choices.map((c) => (
            <Checkbox
              key={c.id}
              label={c.text}
              checked={Array.isArray(value) && value.includes(c.id)}
              onChange={() => onAnswer(toggleChoice(question, value, c.id))}
            />
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  flex: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  navRow: { flexDirection: "row", gap: spacing[3] },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch },
});
