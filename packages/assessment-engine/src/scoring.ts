import type { QuestionContent } from "@skillprove/validation";

/** Kinds with one checkable answer. Only these can be scored automatically. */
export const OBJECTIVE_KINDS = ["multiple_choice", "multiple_select", "true_false"] as const;
export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];

export function isObjectiveKind(kind: string): kind is ObjectiveKind {
  return (OBJECTIVE_KINDS as readonly string[]).includes(kind);
}

export interface ScorableQuestion {
  id: string;
  content: QuestionContent;
}

export interface QuestionResult {
  questionId: string;
  skillId: string;
  answered: boolean;
  correct: boolean;
}

export interface SkillResult {
  skillId: string;
  /** Questions measuring this skill, answered or not. */
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  /** 0 to 100, two decimals, to fit the database's Decimal(5, 2). */
  percent: number;
}

export interface ObjectiveScore {
  questions: QuestionResult[];
  skills: SkillResult[];
  questionCount: number;
  correctCount: number;
  percent: number;
}

export class NotObjectiveError extends Error {
  constructor(questionId: string) {
    super(`Question ${questionId} cannot be scored automatically.`);
    this.name = "NotObjectiveError";
  }
}

const percentOf = (correct: number, total: number) => (total === 0 ? 0 : Math.round((correct / total) * 10000) / 100);

/**
 * Whether a stored response is the correct answer. Responses come from the candidate, so
 * any shape is possible: anything that is not exactly the expected answer counts as wrong.
 * Multiple select is all or nothing.
 */
function isCorrect(content: QuestionContent, response: unknown): boolean {
  switch (content.kind) {
    case "multiple_choice":
      return typeof response === "string" && response === content.correctChoiceId;
    case "true_false":
      return typeof response === "boolean" && response === content.correct;
    case "multiple_select": {
      if (!Array.isArray(response) || !response.every((r) => typeof r === "string")) return false;
      const given = new Set(response);
      if (given.size !== response.length || given.size !== content.correctChoiceIds.length) return false;
      return content.correctChoiceIds.every((id) => given.has(id));
    }
    default:
      return false;
  }
}

/**
 * Scores an attempt in which every question is objective. `responses` is keyed by question ID.
 * Throws `NotObjectiveError` if any question needs a human or AI judgement, so a mixed
 * assessment can never receive a partial automatic score. Unanswered questions count as wrong.
 */
export function scoreObjectiveAttempt(
  questions: readonly ScorableQuestion[],
  responses: Readonly<Record<string, unknown>>,
): ObjectiveScore {
  for (const q of questions) {
    if (!isObjectiveKind(q.content.kind)) throw new NotObjectiveError(q.id);
  }

  const results: QuestionResult[] = questions.map((q) => {
    const response = Object.hasOwn(responses, q.id) ? responses[q.id] : undefined;
    return {
      questionId: q.id,
      skillId: q.content.skillId,
      answered: response !== undefined && response !== null,
      correct: isCorrect(q.content, response),
    };
  });

  const bySkill = new Map<string, QuestionResult[]>();
  for (const r of results) {
    bySkill.set(r.skillId, [...(bySkill.get(r.skillId) ?? []), r]);
  }
  const skills: SkillResult[] = [...bySkill].map(([skillId, rs]) => {
    const correctCount = rs.filter((r) => r.correct).length;
    return {
      skillId,
      questionCount: rs.length,
      answeredCount: rs.filter((r) => r.answered).length,
      correctCount,
      percent: percentOf(correctCount, rs.length),
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  return {
    questions: results,
    skills,
    questionCount: results.length,
    correctCount,
    percent: percentOf(correctCount, results.length),
  };
}
