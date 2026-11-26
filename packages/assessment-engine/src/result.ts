import { verifiedSkillLevel, type AttemptResultState, type DifficultyLevel } from "@skillprove/shared";
import type { SkillPassport } from "@skillprove/validation";

/** How often to ask for a pending result. The server restarts lost scoring runs itself. */
export const RESULT_POLL_MS = 3000;

export const resultPollInterval = (state: AttemptResultState | undefined): number | false => (state === "pending" ? RESULT_POLL_MS : false);

/**
 * What the Skill Passport says about a skill after this attempt: a level once confidence is high
 * enough, "more assessments needed" below that, or nothing if it has no verified score (for
 * example, a skill the assessment did not declare).
 */
export type SkillStanding = { kind: "level"; level: DifficultyLevel } | { kind: "moreNeeded" } | null;

export function skillStanding(passport: SkillPassport | undefined, skillId: string): SkillStanding {
  const verified = passport?.verified.find((v) => v.skill.id === skillId);
  if (!verified) return null;
  const level = verifiedSkillLevel(verified.score, verified.confidence);
  return level ? { kind: "level", level } : { kind: "moreNeeded" };
}
