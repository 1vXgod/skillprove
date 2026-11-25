import { SUBMISSION_GRACE_SECONDS } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import { AttemptDataError } from "../repositories/attempt-errors";
import { attemptDeadline, getCandidateAttempt, listTakeableAssessments, startAttempt } from "../repositories/attempts";
import { createCandidate, createObjectiveAssessment, createSkill, createUser, hasNoTestDatabase, SECRET, useTestDatabase } from "./support";

describe("attemptDeadline", () => {
  const start = new Date("2026-11-25T10:00:00.000Z");
  it("uses the duration, then the attempt lifetime, then 24 hours", () => {
    expect(attemptDeadline(start, { durationMinutes: 30, attemptTtlHours: 2 }).toISOString()).toBe("2026-11-25T10:30:00.000Z");
    expect(attemptDeadline(start, { durationMinutes: null, attemptTtlHours: 2 }).toISOString()).toBe("2026-11-25T12:00:00.000Z");
    expect(attemptDeadline(start, { durationMinutes: null, attemptTtlHours: null }).toISOString()).toBe("2026-11-26T10:00:00.000Z");
  });
});

describe.skipIf(hasNoTestDatabase)("taking assessments: list, start and view", () => {
  const db = useTestDatabase();

  const rejection = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: unknown) => (error instanceof AttemptDataError ? error.reason : error),
    );

  it("lists only published, public, fully objective, undeleted assessments", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const takeable = await createObjectiveAssessment(db, { skillId: skill.id });
    const draft = await createObjectiveAssessment(db, { skillId: skill.id, publish: false });
    const inviteOnly = await createObjectiveAssessment(db, { skillId: skill.id, visibility: "INVITE_ONLY" });
    const mixed = await createObjectiveAssessment(db, { skillId: skill.id, withWrittenQuestion: true });
    const deleted = await createObjectiveAssessment(db, { skillId: skill.id });
    await db.assessment.update({ where: { id: deleted.assessment.id }, data: { deletedAt: new Date() } });

    const ids = (await listTakeableAssessments(db, user.id, "en")).map((a) => a.assessmentId);
    expect(ids).toContain(takeable.assessment.id);
    for (const hidden of [draft, inviteOnly, mixed, deleted]) expect(ids).not.toContain(hidden.assessment.id);
  });

  it("shows each candidate only their own attempt counts", async () => {
    const [alice, bob, skill] = [await createCandidate(db), await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id });
    const { attemptId } = await startAttempt(db, alice.id, assessment.id);

    const forAlice = (await listTakeableAssessments(db, alice.id, "en")).find((a) => a.assessmentId === assessment.id);
    const forBob = (await listTakeableAssessments(db, bob.id, "en")).find((a) => a.assessmentId === assessment.id);
    expect(forAlice).toMatchObject({ attemptsUsed: 1, openAttemptId: attemptId, questionCount: 3, maxAttempts: 2 });
    expect(forBob).toMatchObject({ attemptsUsed: 0, openAttemptId: null });
    expect(forAlice?.skills).toEqual([{ skillId: skill.id, name: expect.any(String) }]);
  });

  it("starts an attempt with a server deadline, and returns the same one on a repeat", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id, durationMinutes: 15 });

    const first = await startAttempt(db, user.id, assessment.id);
    const again = await startAttempt(db, user.id, assessment.id);
    expect(first.created).toBe(true);
    expect(again).toEqual({ attemptId: first.attemptId, created: false });

    // The database stores the hard cutoff (deadline plus grace); the candidate sees the deadline.
    const row = await db.assessmentAttempt.findUniqueOrThrow({ where: { id: first.attemptId } });
    expect(row.attemptNumber).toBe(1);
    expect(row.expiresAt!.getTime() - row.startedAt.getTime()).toBe(15 * 60_000 + SUBMISSION_GRACE_SECONDS * 1000);
    const view = await getCandidateAttempt(db, user.id, first.attemptId);
    expect(new Date(view!.expiresAt!).getTime() - row.startedAt.getTime()).toBe(15 * 60_000);
  });

  it("refuses a new attempt once every allowed attempt is used", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id, maxAttempts: 1 });
    const { attemptId } = await startAttempt(db, user.id, assessment.id);
    await db.assessmentAttempt.update({ where: { id: attemptId }, data: { status: "ABANDONED" } });

    expect(await rejection(startAttempt(db, user.id, assessment.id))).toBe("attempts_exhausted");
  });

  it("asks a user without a candidate profile to create one, and starts nothing", async () => {
    const [user, skill] = [await createUser(db), await createSkill(db)];
    const { assessment, version } = await createObjectiveAssessment(db, { skillId: skill.id });

    expect(await rejection(startAttempt(db, user.id, assessment.id))).toBe("profile_required");
    expect(await db.assessmentAttempt.count({ where: { assessmentVersionId: version.id } })).toBe(0);
  });

  it("refuses assessments that are not takeable, as if they did not exist", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    for (const options of [{ publish: false }, { visibility: "INVITE_ONLY" as const }, { withWrittenQuestion: true }]) {
      const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id, ...options });
      expect(await rejection(startAttempt(db, user.id, assessment.id))).toBe("not_found");
    }
    expect(await rejection(startAttempt(db, user.id, "00000000-0000-4000-8000-000000000000"))).toBe("not_found");
  });

  it("expires an overdue attempt on read, and lets the candidate start the next one", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id, maxAttempts: 2 });
    const first = await startAttempt(db, user.id, assessment.id);
    await db.assessmentAttempt.update({ where: { id: first.attemptId }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await getCandidateAttempt(db, user.id, first.attemptId))?.status).toBe("EXPIRED");
    const second = await startAttempt(db, user.id, assessment.id);
    expect(second.created).toBe(true);
    expect((await db.assessmentAttempt.findUniqueOrThrow({ where: { id: second.attemptId } })).attemptNumber).toBe(2);
  });

  it("shows the candidate questions in order, with no answer keys or explanations", async () => {
    const [user, skill] = [await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id });
    const { attemptId } = await startAttempt(db, user.id, assessment.id);

    const view = await getCandidateAttempt(db, user.id, attemptId);
    expect(view?.status).toBe("IN_PROGRESS");
    expect(view?.questions.map((q) => q.kind)).toEqual(["multiple_choice", "true_false", "multiple_select"]);
    expect(view?.questions[0]).toEqual({
      id: expect.any(String),
      position: 1,
      kind: "multiple_choice",
      prompt: "Pick two.",
      choices: [
        { id: "A", text: "One" },
        { id: "B", text: "Two" },
        { id: "C", text: "Three" },
      ],
    });
    expect(JSON.stringify(view)).not.toContain(SECRET);
    expect(JSON.stringify(view)).not.toMatch(/correct|answerKey|explanation/);
  });

  it("hides another candidate's attempt, and shows no questions once it is finished", async () => {
    const [alice, bob, skill] = [await createCandidate(db), await createCandidate(db), await createSkill(db)];
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id });
    const { attemptId } = await startAttempt(db, alice.id, assessment.id);

    expect(await getCandidateAttempt(db, bob.id, attemptId)).toBeNull();
    await db.assessmentAttempt.update({ where: { id: attemptId }, data: { status: "ABANDONED" } });
    expect((await getCandidateAttempt(db, alice.id, attemptId))?.questions).toEqual([]);
  });
});
