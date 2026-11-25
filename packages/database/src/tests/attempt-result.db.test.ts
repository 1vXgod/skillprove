import { SCORING_RETRY_AFTER_SECONDS } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import { AttemptDataError } from "../repositories/attempt-errors";
import { scoreAttempt } from "../repositories/attempt-scoring";
import { getAttemptResult, startAttempt, submitAttempt } from "../repositories/attempts";
import { createCandidate, createObjectiveAssessment, createSkill, hasNoTestDatabase, SECRET, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("reading an attempt's result", () => {
  const db = useTestDatabase();

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: unknown) => (error instanceof AttemptDataError ? error.reason : error),
    );

  /** Started, and submitted with `answers` by position unless `submit` is false. Correct: "B", false, ["A", "C"]. */
  async function attempt(options: { answers?: Record<number, unknown>; submit?: boolean; withUnreadableQuestion?: boolean } = {}) {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment, version } = await createObjectiveAssessment(db, { skillId: skill.id, withUnreadableQuestion: options.withUnreadableQuestion });
    const { attemptId } = await startAttempt(db, user.id, assessment.id);
    if (options.submit !== false) {
      const questions = await db.assessmentQuestion.findMany({ where: { assessmentVersionId: version.id }, orderBy: { position: "asc" } });
      const answers = options.answers ?? {};
      await submitAttempt(db, user.id, attemptId, Object.fromEntries(questions.filter((q) => q.position in answers).map((q) => [q.id, answers[q.position]])));
    }
    return { user, skill, attemptId };
  }

  it("is pending until scored, and asks for a retry only once scoring looks lost", async () => {
    const { user, attemptId } = await attempt();
    const fresh = await getAttemptResult(db, user.id, attemptId, "en");
    expect(fresh.result).toMatchObject({ state: "pending", percent: null, scoredAt: null, questionCount: 3, skills: [] });
    expect(fresh.retryScoring).toBe(false);

    const longAgo = new Date(Date.now() - (SCORING_RETRY_AFTER_SECONDS + 5) * 1000);
    await db.assessmentAttempt.update({ where: { id: attemptId }, data: { submittedAt: longAgo } });
    expect((await getAttemptResult(db, user.id, attemptId, "en")).retryScoring).toBe(true);
  });

  it("shows overall and per-skill percentages once scored, and nothing about single questions", async () => {
    const { user, skill, attemptId } = await attempt({ answers: { 1: "B", 2: true } });
    await scoreAttempt(db, attemptId);

    const { result, retryScoring } = await getAttemptResult(db, user.id, attemptId, "en");
    expect(retryScoring).toBe(false);
    expect(result).toEqual({
      attemptId,
      state: "scored",
      submittedAt: expect.any(String),
      scoredAt: expect.any(String),
      questionCount: 3,
      percent: 33.33,
      skills: [{ skillId: skill.id, name: expect.any(String), questionCount: 3, answeredCount: 2, percent: 33.33 }],
    });
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(JSON.stringify(result)).not.toMatch(/correct|answerKey|explanation|questionId/);
  });

  it("reports an attempt that cannot be scored as failed, with no scores and no retry", async () => {
    const { user, attemptId } = await attempt({ withUnreadableQuestion: true });
    await scoreAttempt(db, attemptId);
    await db.assessmentAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date(Date.now() - 3_600_000) } });

    const { result, retryScoring } = await getAttemptResult(db, user.id, attemptId, "en");
    expect(result).toMatchObject({ state: "failed", percent: null, scoredAt: null, skills: [] });
    expect(retryScoring).toBe(false);
    // The reason is for administrators, not the candidate.
    expect(JSON.stringify(result)).not.toMatch(/cannot be read/);
  });

  it("has no result before submitting, after expiry, or for someone else", async () => {
    const inProgress = await attempt({ submit: false });
    expect(await rejection(getAttemptResult(db, inProgress.user.id, inProgress.attemptId, "en"))).toBe("not_submitted");

    // Started an hour ago: the database requires expires_at to be after started_at.
    await db.assessmentAttempt.update({
      where: { id: inProgress.attemptId },
      data: { startedAt: new Date(Date.now() - 3_600_000), expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await rejection(getAttemptResult(db, inProgress.user.id, inProgress.attemptId, "en"))).toBe("expired");

    const submitted = await attempt();
    const stranger = await createCandidate(db);
    expect(await rejection(getAttemptResult(db, stranger.id, submitted.attemptId, "en"))).toBe("not_found");
  });
});
