import { describe, expect, it } from "vitest";
import { recordVerifiedSkillScore } from "../repositories/verified-skill-scores";
import {
  createPublishedAssessment,
  createSkill,
  createSubmittedAttempt,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

describe.skipIf(hasNoTestDatabase)("automatic evaluations", () => {
  const db = useTestDatabase();

  async function submitted() {
    const [candidate, skill] = [await createUser(db), await createSkill(db)];
    const published = await createPublishedAssessment(db, { skillId: skill.id });
    const { attempt, submission } = await createSubmittedAttempt(db, published, candidate.id);
    const data = {
      attemptId: attempt.id,
      submissionId: submission.id,
      rubricVersionId: published.rubric.id,
      evaluatorType: "AUTOMATIC" as const,
      reviewStatus: "NOT_REQUIRED" as const,
    };
    return { candidate, skill, published, data };
  }

  it("accepts an automatic evaluation that records only its formula version", async () => {
    const { data } = await submitted();
    const evaluation = await db.evaluation.create({ data: { ...data, promptVersion: "auto-v1" } });
    expect(evaluation).toMatchObject({ evaluatorType: "AUTOMATIC", provider: null, evaluatorUserId: null });
  });

  it("requires the formula version", async () => {
    const { data } = await submitted();
    await expect(db.evaluation.create({ data })).rejects.toThrow(/evaluations_automatic_has_formula_only/);
  });

  it("refuses AI or human details on an automatic evaluation", async () => {
    const { data, candidate } = await submitted();
    const base = { ...data, promptVersion: "auto-v1" };
    await expect(db.evaluation.create({ data: { ...base, provider: "p" } })).rejects.toThrow(
      /evaluations_automatic_has_formula_only/,
    );
    await expect(db.evaluation.create({ data: { ...base, modelName: "m" } })).rejects.toThrow(
      /evaluations_automatic_has_formula_only/,
    );
    await expect(db.evaluation.create({ data: { ...base, evaluatorUserId: candidate.id } })).rejects.toThrow(
      /evaluations_automatic_has_formula_only/,
    );
  });

  it("follows the same lifecycle rules and can back a verified score", async () => {
    const { data, candidate, skill, published } = await submitted();
    const pending = await db.evaluation.create({ data: { ...data, promptVersion: "auto-v1" } });

    // The existing trigger still demands criterion scores before completion.
    await expect(
      db.evaluation.update({ where: { id: pending.id }, data: { status: "COMPLETED", overallScore: 75 } }),
    ).rejects.toThrow(/criterion scores/);

    for (const criterion of published.criteria) {
      await db.evaluationCriterionScore.create({
        data: { evaluationId: pending.id, rubricVersionId: published.rubric.id, criterionId: criterion.id, score: 75 },
      });
    }
    const completed = await db.evaluation.update({
      where: { id: pending.id },
      data: { status: "COMPLETED", overallScore: 75, completedAt: new Date() },
    });

    // And it freezes like any other finished evaluation.
    await expect(db.evaluation.update({ where: { id: completed.id }, data: { overallScore: 100 } })).rejects.toThrow(
      /immutable/,
    );

    const score = await recordVerifiedSkillScore(db, {
      userId: candidate.id,
      skillId: skill.id,
      score: 75,
      confidence: 50,
      highestDifficulty: "INTERMEDIATE",
      formulaVersion: "auto-v1",
      evidence: [{ evaluationId: completed.id, weight: 1.2 }],
    });
    expect(Number(score.score)).toBe(75);
  });
});
