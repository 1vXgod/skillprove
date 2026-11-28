import { takeableState } from "./takeable";
import type { DifficultyLevel } from "./candidate";
import { skillMedal, type SkillMedal } from "./skill-medal";
import { verifiedSkillLevel } from "./verified-score";

/*
 * What the candidate home shows (web now, mobile next), as pure functions over the API's data.
 * Inputs are structural, so this package stays free of the validation schemas. Nothing here
 * invents data: every item comes from the Skill Passport or the list of assessments.
 */

interface VerifiedInput {
  skill: { id: string; name: string };
  score: number;
  confidence: number;
  evidenceStatus?: "CURRENT" | "OUTDATED";
  evidence: readonly { evaluationId: string; assessmentTitle: string; completedAt: string | null; superseded: boolean }[];
}

interface PassportInput {
  verified: readonly VerifiedInput[];
  inAssessment: readonly {
    attempts: readonly { attemptId: string; assessmentTitle: string; stage: "IN_PROGRESS" | "AWAITING_EVALUATION"; startedAt: string; submittedAt: string | null }[];
  }[];
}

export interface TopSkill {
  skillId: string;
  name: string;
  score: number;
  /** Null while confidence is too low: "more assessments needed". */
  level: DifficultyLevel | null;
  /** Null for Beginner and while confidence is too low. */
  medal: SkillMedal | null;
  outdated: boolean;
}

/** Distinct skills on the Skill Passport, verified or self-reported. Profile completeness counts these. */
export function passportSkillCount(passport: { verified: readonly { skill: { id: string } }[]; selfReported: readonly { skill: { id: string } }[] }): number {
  return new Set([...passport.verified.map((v) => v.skill.id), ...passport.selfReported.map((s) => s.skill.id)]).size;
}

/** How many verified skills have earned a medal (any colour, current or outdated). */
export function earnedMedalCount(verified: readonly { score: number; confidence: number }[]): number {
  return verified.filter((v) => skillMedal(v.score, v.confidence) !== null).length;
}

/** The highest-scoring verified skills, with their Skill Passport level. */
export function topVerifiedSkills(passport: PassportInput, limit = 4): TopSkill[] {
  return [...passport.verified]
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map((v) => ({ skillId: v.skill.id, name: v.skill.name, score: v.score, level: verifiedSkillLevel(v.score, v.confidence), medal: skillMedal(v.score, v.confidence), outdated: v.evidenceStatus === "OUTDATED" }));
}

export type ActivityKind = "verified" | "submitted" | "started";
export interface ActivityItem {
  /** Stable across renders, for React keys. */
  id: string;
  kind: ActivityKind;
  title: string;
  at: string;
}

/**
 * Real events only, newest first: a result added to the Skill Passport, an attempt submitted, an
 * attempt started. One event per attempt (its latest stage) and per evaluation, even when an
 * assessment covers several skills. Corrected (superseded) results are left out.
 */
export function recentActivity(passport: PassportInput, limit = 5): ActivityItem[] {
  const items = new Map<string, ActivityItem>();
  for (const v of passport.verified) {
    for (const e of v.evidence) {
      if (e.superseded || !e.completedAt) continue;
      items.set(`verified:${e.evaluationId}`, { id: `verified:${e.evaluationId}`, kind: "verified", title: e.assessmentTitle, at: e.completedAt });
    }
  }
  for (const skill of passport.inAssessment) {
    for (const a of skill.attempts) {
      const submitted = a.stage === "AWAITING_EVALUATION" && a.submittedAt;
      const id = `attempt:${a.attemptId}`;
      items.set(id, submitted ? { id, kind: "submitted", title: a.assessmentTitle, at: a.submittedAt as string } : { id, kind: "started", title: a.assessmentTitle, at: a.startedAt });
    }
  }
  return [...items.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

interface TakeableInput {
  assessmentId: string;
  title: string;
  attemptsUsed: number;
  maxAttempts: number;
  openAttemptId: string | null;
}

/** An attempt still being taken, to offer "Continue". */
export function continueAttempt(items: readonly TakeableInput[]): { attemptId: string; title: string } | null {
  const open = items.find((i) => i.openAttemptId);
  return open?.openAttemptId ? { attemptId: open.openAttemptId, title: open.title } : null;
}

/** How many assessments the candidate can start now. */
export function availableCount(items: readonly TakeableInput[]): number {
  return items.filter((i) => takeableState(i) === "available").length;
}
