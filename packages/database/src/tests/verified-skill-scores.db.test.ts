import { describe, expect, it } from "vitest";
import { recordVerifiedSkillScoreInTransaction, type VerifiedSkillScoreInput } from "../repositories/verified-skill-scores";
import { createCompletedEvaluation, createSkill, createUser, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("recording a verified score inside the caller's transaction", () => {
  const db = useTestDatabase();

  async function setup() {
    const [candidate, skill] = [await createUser(db), await createSkill(db)];
    const { evaluation } = await createCompletedEvaluation(db, { skillId: skill.id, candidateUserId: candidate.id });
    const input: VerifiedSkillScoreInput = {
      userId: candidate.id,
      skillId: skill.id,
      score: 70,
      confidence: 40,
      highestDifficulty: "INTERMEDIATE",
      formulaVersion: "auto-v1",
      evidence: [{ evaluationId: evaluation.id, weight: 1.2 }],
    };
    return { candidate, skill, input };
  }

  const stored = (userId: string, skillId: string) =>
    Promise.all([
      db.verifiedSkillScore.findUnique({ where: { userId_skillId: { userId, skillId } } }),
      db.verifiedSkillScoreCalculation.count({ where: { userId, skillId } }),
    ]);

  it("commits the score together with the caller's other writes", async () => {
    const { candidate, skill, input } = await setup();
    await db.$transaction(async (tx) => {
      await recordVerifiedSkillScoreInTransaction(tx, input);
      await tx.auditLog.create({ data: { action: "test.score_recorded", targetType: "user", targetId: candidate.id } });
    });

    const [score, calculations] = await stored(candidate.id, skill.id);
    expect(Number(score?.score)).toBe(70);
    expect(calculations).toBe(1);
    expect(await db.auditLog.count({ where: { action: "test.score_recorded", targetId: candidate.id } })).toBe(1);
  });

  it("leaves no score or calculation when the caller's transaction fails afterwards", async () => {
    const { candidate, skill, input } = await setup();
    await expect(
      db.$transaction(async (tx) => {
        await recordVerifiedSkillScoreInTransaction(tx, input);
        throw new Error("a later step failed");
      }),
    ).rejects.toThrow("a later step failed");

    const [score, calculations] = await stored(candidate.id, skill.id);
    expect(score).toBeNull();
    expect(calculations).toBe(0);
  });

  it("still refuses a calculation without evidence when the outer transaction commits", async () => {
    const { candidate, skill, input } = await setup();
    await expect(
      db.$transaction((tx) => recordVerifiedSkillScoreInTransaction(tx, { ...input, evidence: [] })),
    ).rejects.toThrow(/needs evaluation evidence/);

    const [score, calculations] = await stored(candidate.id, skill.id);
    expect(score).toBeNull();
    expect(calculations).toBe(0);
  });
});
