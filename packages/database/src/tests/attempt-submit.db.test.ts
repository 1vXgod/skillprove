import { describe, expect, it } from "vitest";
import { AttemptDataError } from "../repositories/attempt-errors";
import { getCandidateAttempt, startAttempt, submitAttempt } from "../repositories/attempts";
import { createCandidate, createObjectiveAssessment, createSkill, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("submitting an attempt", () => {
  const db = useTestDatabase();

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: unknown) => (error instanceof AttemptDataError ? error.reason : error),
    );

  async function started() {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment, version } = await createObjectiveAssessment(db, { skillId: skill.id });
    const { attemptId } = await startAttempt(db, user.id, assessment.id);
    const questions = await db.assessmentQuestion.findMany({ where: { assessmentVersionId: version.id }, orderBy: { position: "asc" } });
    return { user, attemptId, questionIds: questions.map((q) => q.id) };
  }

  /**
   * Moves the hard cutoff (deadline plus grace) relative to now. The start moves an hour back
   * too, because the database requires expires_at to be after started_at.
   */
  const setCutoff = (attemptId: string, offsetMs: number) =>
    db.assessmentAttempt.update({
      where: { id: attemptId },
      data: { startedAt: new Date(Date.now() - 3_600_000), expiresAt: new Date(Date.now() + offsetMs) },
    });

  it("stores only answers to this attempt's questions, and closes the attempt", async () => {
    const { user, attemptId, questionIds } = await started();
    const [mc, tf] = questionIds;
    const result = await submitAttempt(db, user.id, attemptId, { [mc!]: "B", [tf!]: false, "00000000-0000-4000-8000-000000000000": "A" });

    const submission = await db.assessmentSubmission.findUniqueOrThrow({ where: { id: result.submissionId } });
    expect(submission.responses).toEqual({ [mc!]: "B", [tf!]: false });
    const attempt = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.status).toBe("SUBMITTED");
    expect(attempt.submittedAt?.toISOString()).toBe(result.submittedAt);
    expect((await getCandidateAttempt(db, user.id, attemptId))?.questions).toEqual([]);
  });

  it("accepts an empty submission: unanswered questions simply count as wrong later", async () => {
    const { user, attemptId } = await started();
    await submitAttempt(db, user.id, attemptId, {});
    expect((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).status).toBe("SUBMITTED");
  });

  it("accepts a submission once, and refuses a second one", async () => {
    const { user, attemptId } = await started();
    await submitAttempt(db, user.id, attemptId, {});
    expect(await rejection(submitAttempt(db, user.id, attemptId, {}))).toBe("not_in_progress");
    expect(await db.assessmentSubmission.count({ where: { attemptId } })).toBe(1);
  });

  it("lets exactly one of two simultaneous submissions through", async () => {
    const { user, attemptId } = await started();
    const results = await Promise.allSettled([submitAttempt(db, user.id, attemptId, {}), submitAttempt(db, user.id, attemptId, {})]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.assessmentSubmission.count({ where: { attemptId } })).toBe(1);
  });

  it("accepts a submission within the grace period after the deadline", async () => {
    const { user, attemptId } = await started();
    // The deadline the candidate saw passed 25 seconds ago; the cutoff is 5 seconds away.
    await setCutoff(attemptId, 5_000);
    expect(new Date((await getCandidateAttempt(db, user.id, attemptId))!.expiresAt!).getTime()).toBeLessThan(Date.now());
    await submitAttempt(db, user.id, attemptId, {});
    expect((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).status).toBe("SUBMITTED");
  });

  it("refuses a submission after the grace period, and marks the attempt expired", async () => {
    const { user, attemptId } = await started();
    await setCutoff(attemptId, -1_000);
    expect(await rejection(submitAttempt(db, user.id, attemptId, {}))).toBe("expired");
    expect((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).status).toBe("EXPIRED");
    expect(await db.assessmentSubmission.count({ where: { attemptId } })).toBe(0);
  });

  it("treats someone else's attempt as missing", async () => {
    const { attemptId } = await started();
    const stranger = await createCandidate(db);
    expect(await rejection(submitAttempt(db, stranger.id, attemptId, {}))).toBe("not_found");
    expect(await db.assessmentSubmission.count({ where: { attemptId } })).toBe(0);
  });
});
