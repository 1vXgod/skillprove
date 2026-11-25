import { describe, expect, it } from "vitest";
import { scoreAttempt } from "../repositories/attempt-scoring";
import { startAttempt, submitAttempt } from "../repositories/attempts";
import { createCandidate, createObjectiveAssessment, createSkill, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("scoring a submitted attempt", () => {
  const db = useTestDatabase();

  /**
   * The fixture's correct answers: multiple choice "B", true/false false, multiple select A and C.
   * `answers` maps question position (1 to 3) to the response.
   */
  async function submitted(options: {
    answers: Record<number, unknown>;
    maxAttempts?: number;
    difficulty?: "BEGINNER" | "EXPERT";
    user?: { id: string };
    skill?: { id: string };
  }) {
    const user = options.user ?? (await createCandidate(db));
    const skill = options.skill ?? (await createSkill(db));
    const { assessment, version } = await createObjectiveAssessment(db, {
      skillId: skill.id,
      maxAttempts: options.maxAttempts,
      difficulty: options.difficulty,
    });
    return { user, skill, assessment, ...(await takeAgain(user.id, assessment.id, version.id, options.answers)) };
  }

  async function takeAgain(userId: string, assessmentId: string, versionId: string, answers: Record<number, unknown>) {
    const { attemptId } = await startAttempt(db, userId, assessmentId);
    const questions = await db.assessmentQuestion.findMany({ where: { assessmentVersionId: versionId }, orderBy: { position: "asc" } });
    const byId = Object.fromEntries(questions.filter((q) => q.position in answers).map((q) => [q.id, answers[q.position]]));
    await submitAttempt(db, userId, attemptId, byId);
    return { attemptId, versionId };
  }

  const ALL_CORRECT = { 1: "B", 2: false, 3: ["A", "C"] };

  it("scores from the stored answers and records the evaluation, its results and the verified score", async () => {
    // Two of three correct: true/false is wrong.
    const { user, skill, attemptId } = await submitted({ answers: { 1: "B", 2: true, 3: ["C", "A"] } });
    const result = await scoreAttempt(db, attemptId);
    expect(result?.created).toBe(true);

    const evaluation = await db.evaluation.findUniqueOrThrow({
      where: { id: result!.evaluationId },
      include: { criterionScores: true, skillResults: true },
    });
    expect(evaluation).toMatchObject({ evaluatorType: "AUTOMATIC", status: "COMPLETED", promptVersion: "auto-v1", reviewStatus: "NOT_REQUIRED" });
    expect(Number(evaluation.overallScore)).toBe(66.67);
    expect(evaluation.completedAt).not.toBeNull();
    // The fixture's only criterion is linked to the skill, so it gets the skill's result.
    expect(evaluation.criterionScores.map((c) => [Number(c.score), c.rationale])).toEqual([[66.67, "auto-v1: 2 of 3 correct"]]);
    expect(evaluation.skillResults.map((s) => ({ ...s, percent: Number(s.percent) }))).toEqual([
      expect.objectContaining({ skillId: skill.id, questionCount: 3, answeredCount: 3, correctCount: 2, percent: 66.67 }),
    ]);

    const verified = await db.verifiedSkillScore.findUniqueOrThrow({ where: { userId_skillId: { userId: user.id, skillId: skill.id } } });
    expect(Number(verified.score)).toBe(66.67);
    // Confidence is 5 per answered question.
    expect(Number(verified.confidence)).toBe(15);
    expect(verified).toMatchObject({ assessmentCount: 1, highestDifficulty: "INTERMEDIATE" });
  });

  it("counts unanswered questions as wrong, and adds no confidence for them", async () => {
    const { user, skill, attemptId } = await submitted({ answers: { 1: "B" } });
    await scoreAttempt(db, attemptId);

    const verified = await db.verifiedSkillScore.findUniqueOrThrow({ where: { userId_skillId: { userId: user.id, skillId: skill.id } } });
    expect(Number(verified.score)).toBe(33.33);
    expect(Number(verified.confidence)).toBe(5);
  });

  it("scores once: a repeat returns the same evaluation and writes nothing new", async () => {
    const { user, attemptId } = await submitted({ answers: ALL_CORRECT });
    const first = await scoreAttempt(db, attemptId);
    const again = await scoreAttempt(db, attemptId);

    expect(again).toEqual({ evaluationId: first!.evaluationId, created: false });
    expect(await db.evaluation.count({ where: { attemptId } })).toBe(1);
    expect(await db.verifiedSkillScoreCalculation.count({ where: { userId: user.id } })).toBe(1);
  });

  it("lets only one of two simultaneous runs score", async () => {
    const { user, attemptId } = await submitted({ answers: ALL_CORRECT });
    const [a, b] = await Promise.all([scoreAttempt(db, attemptId), scoreAttempt(db, attemptId)]);

    expect([a?.created, b?.created].sort()).toEqual([false, true]);
    expect(a?.evaluationId).toBe(b?.evaluationId);
    expect(await db.evaluation.count({ where: { attemptId } })).toBe(1);
    expect(await db.verifiedSkillScoreCalculation.count({ where: { userId: user.id } })).toBe(1);
  });

  it("scores nothing until the attempt is submitted", async () => {
    const user = await createCandidate(db);
    const skill = await createSkill(db);
    const { assessment } = await createObjectiveAssessment(db, { skillId: skill.id });
    const { attemptId } = await startAttempt(db, user.id, assessment.id);

    expect(await scoreAttempt(db, attemptId)).toBeNull();
    expect(await scoreAttempt(db, "00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await db.evaluation.count({ where: { attemptId } })).toBe(0);
  });

  it("lets a retake replace the earlier result, and keeps the earlier calculation for the record", async () => {
    const first = await submitted({ answers: ALL_CORRECT, maxAttempts: 2 });
    await scoreAttempt(db, first.attemptId);
    const second = await takeAgain(first.user.id, first.assessment.id, first.versionId, { 1: "A", 2: true, 3: ["A"] });
    await scoreAttempt(db, second.attemptId);

    const where = { userId_skillId: { userId: first.user.id, skillId: first.skill.id } };
    const verified = await db.verifiedSkillScore.findUniqueOrThrow({ where });
    expect(Number(verified.score)).toBe(0);
    expect(verified.assessmentCount).toBe(1);
    expect(await db.verifiedSkillScoreCalculation.count({ where: { userId: first.user.id, skillId: first.skill.id } })).toBe(2);
  });

  it("combines different assessments of the same skill, weighted by difficulty", async () => {
    const easy = await submitted({ answers: ALL_CORRECT, difficulty: "BEGINNER" });
    await scoreAttempt(db, easy.attemptId);
    const hard = await submitted({ answers: {}, difficulty: "EXPERT", user: easy.user, skill: easy.skill });
    await scoreAttempt(db, hard.attemptId);

    const verified = await db.verifiedSkillScore.findUniqueOrThrow({ where: { userId_skillId: { userId: easy.user.id, skillId: easy.skill.id } } });
    expect(verified).toMatchObject({ assessmentCount: 2, highestDifficulty: "EXPERT" });
    // (100 × 1 + 0 × 1.6) / 2.6
    expect(Number(verified.score)).toBe(38.46);
    // Three answered on the first, none on the second.
    expect(Number(verified.confidence)).toBe(15);
  });

  it("freezes skill results once the evaluation completes, and allows one automatic evaluation per attempt", async () => {
    const { attemptId } = await submitted({ answers: ALL_CORRECT });
    const { evaluationId } = (await scoreAttempt(db, attemptId))!;
    const evaluation = await db.evaluation.findUniqueOrThrow({ where: { id: evaluationId } });

    await expect(db.evaluationSkillResult.updateMany({ where: { evaluationId }, data: { percent: 0 } })).rejects.toThrow(/finished evaluation is immutable/);
    await expect(db.evaluationSkillResult.deleteMany({ where: { evaluationId } })).rejects.toThrow(/finished evaluation is immutable/);
    await expect(
      db.evaluation.create({
        data: {
          attemptId,
          submissionId: evaluation.submissionId,
          rubricVersionId: evaluation.rubricVersionId,
          evaluatorType: "AUTOMATIC",
          promptVersion: "auto-v1",
        },
      }),
    ).rejects.toThrow(/Unique constraint|evaluations_one_automatic_per_attempt/);
    expect(await db.evaluation.count({ where: { attemptId } })).toBe(1);
  });

  it("refuses skill results that do not add up", async () => {
    const { attemptId } = await submitted({ answers: ALL_CORRECT });
    const evaluation = await db.evaluation.create({
      data: {
        attemptId,
        submissionId: (await db.assessmentSubmission.findFirstOrThrow({ where: { attemptId } })).id,
        rubricVersionId: (await db.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } })).rubricVersionId,
        evaluatorType: "HUMAN",
        evaluatorUserId: (await createCandidate(db)).id,
      },
    });
    const skillId = (await createSkill(db)).id;
    const row = { evaluationId: evaluation.id, skillId, questionCount: 3, answeredCount: 2, correctCount: 2, percent: 66.67 };

    for (const bad of [{ questionCount: 0, answeredCount: 0, correctCount: 0 }, { answeredCount: 4 }, { correctCount: 3 }, { percent: 101 }]) {
      await expect(db.evaluationSkillResult.create({ data: { ...row, ...bad } })).rejects.toThrow(/evaluation_skill_results_counts_valid/);
    }
    await db.evaluation.delete({ where: { id: evaluation.id } });
  });
});
