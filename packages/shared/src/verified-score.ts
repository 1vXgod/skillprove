import type { DifficultyLevel } from "./candidate";

/** Below this confidence a verified score is shown without a level ("more assessments needed"). */
export const VERIFIED_LEVEL_MIN_CONFIDENCE = 50;

/** Lowest score for each level, highest first. Display only: no level is stored, so this can change freely. */
export const VERIFIED_LEVEL_THRESHOLDS: readonly { level: DifficultyLevel; minScore: number }[] = [
  { level: "EXPERT", minScore: 80 },
  { level: "ADVANCED", minScore: 60 },
  { level: "INTERMEDIATE", minScore: 40 },
  { level: "BEGINNER", minScore: 0 },
];

/** The level to show for a verified score, or null when confidence is too low to name one. */
export function verifiedSkillLevel(score: number, confidence: number): DifficultyLevel | null {
  if (confidence < VERIFIED_LEVEL_MIN_CONFIDENCE) return null;
  return VERIFIED_LEVEL_THRESHOLDS.find((t) => score >= t.minScore)?.level ?? "BEGINNER";
}
