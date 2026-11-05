import type { PrismaClient } from "../generated/prisma/client";
import type { DifficultyLevel } from "../generated/prisma/enums";

export interface VerifiedSkillScoreInput {
  userId: string;
  skillId: string;
  score: number;
  confidence: number;
  highestDifficulty: DifficultyLevel;
  formulaVersion: string;
  /** The completed evaluations behind this score, and how much each one counted. */
  evidence: { evaluationId: string; weight: number }[];
}

/**
 * The only supported way to change a verified score. It appends a calculation with its
 * evidence and points the current score at it, so earlier results stay auditable. Calling
 * this is a job for the evaluation pipeline, never a candidate-facing endpoint.
 */
export function recordVerifiedSkillScore(client: PrismaClient, input: VerifiedSkillScoreInput) {
  const { userId, skillId, score, confidence, highestDifficulty, formulaVersion, evidence } = input;

  return client.$transaction(async (tx) => {
    const calculation = await tx.verifiedSkillScoreCalculation.create({
      data: {
        userId,
        skillId,
        score,
        confidence,
        highestDifficulty,
        formulaVersion,
        assessmentCount: evidence.length,
        inputs: { create: evidence },
      },
    });

    // The database copies these values from the calculation. They are required by the type only.
    const values = {
      calculationId: calculation.id,
      score,
      confidence,
      highestDifficulty,
      assessmentCount: evidence.length,
      lastVerifiedAt: calculation.calculatedAt,
    };
    return tx.verifiedSkillScore.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, ...values },
      update: values,
    });
  });
}
