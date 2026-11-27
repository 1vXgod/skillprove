import { verifiedSkillLevel } from "./verified-score";

export const SKILL_MEDALS = ["gold", "silver", "bronze"] as const;
export type SkillMedal = (typeof SKILL_MEDALS)[number];

/**
 * The medal for a verified score: gold from 80, silver from 60, bronze from 40, and only when
 * confidence is at least 50. It is the verified level drawn as a medal (Expert, Advanced,
 * Intermediate), so the two can never disagree; Beginner and low confidence get none.
 * Display only: nothing is stored.
 */
export function skillMedal(score: number, confidence: number): SkillMedal | null {
  switch (verifiedSkillLevel(score, confidence)) {
    case "EXPERT":
      return "gold";
    case "ADVANCED":
      return "silver";
    case "INTERMEDIATE":
      return "bronze";
    default:
      return null;
  }
}
