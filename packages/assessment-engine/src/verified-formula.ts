import { DIFFICULTY_LEVELS, type DifficultyLevel } from "@skillprove/shared";

/** Stored on every calculation, so old scores stay explainable if the formula changes. */
export const AUTO_FORMULA_VERSION = "auto-v1";

/** Harder assessments count for more. */
export const DIFFICULTY_WEIGHTS: Record<DifficultyLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 1.2,
  ADVANCED: 1.4,
  EXPERT: 1.6,
};

/** Each answered question adds this much confidence, up to 100. Full confidence needs 20 answered questions. */
export const CONFIDENCE_PER_ANSWERED_QUESTION = 5;

/** One completed automatic evaluation, reduced to what the formula needs for one skill. */
export interface SkillEvaluationInput {
  evaluationId: string;
  assessmentId: string;
  completedAt: Date;
  difficulty: DifficultyLevel;
  /** This skill's percentage in that evaluation, 0 to 100. */
  percent: number;
  /** Questions for this skill the candidate answered. Skipped questions add no confidence. */
  answeredCount: number;
}

export interface VerifiedSkillCalculation {
  score: number;
  confidence: number;
  highestDifficulty: DifficultyLevel;
  formulaVersion: string;
  /** The evaluations that counted, each with its difficulty weight. Matches `recordVerifiedSkillScore`. */
  evidence: { evaluationId: string; weight: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Only the most recent evaluation per assessment counts, so a retake replaces the earlier result. */
function latestPerAssessment(inputs: readonly SkillEvaluationInput[]): SkillEvaluationInput[] {
  const latest = new Map<string, SkillEvaluationInput>();
  for (const input of inputs) {
    const current = latest.get(input.assessmentId);
    const newer =
      !current ||
      input.completedAt.getTime() > current.completedAt.getTime() ||
      (input.completedAt.getTime() === current.completedAt.getTime() && input.evaluationId > current.evaluationId);
    if (newer) latest.set(input.assessmentId, input);
  }
  return [...latest.values()];
}

/**
 * Formula `auto-v1` for one candidate and one skill:
 * - score: average of the counted percentages, weighted by assessment difficulty;
 * - confidence: 5 per answered question across the counted evaluations, capped at 100;
 * - highest difficulty: the hardest counted assessment.
 * Returns null when there is nothing to count, because a calculation without evidence is invalid.
 */
export function calculateVerifiedSkillScore(inputs: readonly SkillEvaluationInput[]): VerifiedSkillCalculation | null {
  const counted = latestPerAssessment(inputs);
  if (counted.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  let answered = 0;
  for (const input of counted) {
    const weight = DIFFICULTY_WEIGHTS[input.difficulty];
    weightedSum += input.percent * weight;
    totalWeight += weight;
    answered += input.answeredCount;
  }

  const highestDifficulty = counted.reduce<DifficultyLevel>(
    (highest, input) =>
      DIFFICULTY_LEVELS.indexOf(input.difficulty) > DIFFICULTY_LEVELS.indexOf(highest) ? input.difficulty : highest,
    "BEGINNER",
  );

  return {
    score: round2(weightedSum / totalWeight),
    confidence: Math.min(100, CONFIDENCE_PER_ANSWERED_QUESTION * answered),
    highestDifficulty,
    formulaVersion: AUTO_FORMULA_VERSION,
    evidence: counted.map((input) => ({ evaluationId: input.evaluationId, weight: DIFFICULTY_WEIGHTS[input.difficulty] })),
  };
}
