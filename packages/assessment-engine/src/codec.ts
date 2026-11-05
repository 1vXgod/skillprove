import type { AssessmentDifficulty, QuestionKind } from "@skillprove/shared";
import { questionContentSchema, type QuestionContent } from "@skillprove/validation";

/** The database `QuestionType` values this module produces. `CODE` and `FILE_UPLOAD` are never used here. */
export type StoredQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT" | "LONG_TEXT";

/** The shape of an `assessment_questions` row, without ids. `options` is candidate-facing; `answerKey` is private. */
export interface StoredQuestion {
  type: StoredQuestionType | string;
  prompt: string;
  options: unknown;
  answerKey: unknown;
  explanation: string | null;
  skillId: string | null;
  difficulty: AssessmentDifficulty | string | null;
  estimatedMinutes: number | null;
}

export function encodeQuestion(q: QuestionContent): StoredQuestion {
  const common = { skillId: q.skillId, difficulty: q.difficulty, estimatedMinutes: q.estimatedMinutes };
  switch (q.kind) {
    case "multiple_choice":
      return {
        ...common,
        type: "SINGLE_CHOICE",
        prompt: q.prompt,
        options: { kind: q.kind, choices: q.choices },
        answerKey: { kind: q.kind, correctChoiceId: q.correctChoiceId },
        explanation: q.explanation,
      };
    case "multiple_select":
      return {
        ...common,
        type: "MULTIPLE_CHOICE",
        prompt: q.prompt,
        options: { kind: q.kind, choices: q.choices },
        answerKey: { kind: q.kind, correctChoiceIds: q.correctChoiceIds },
        explanation: q.explanation,
      };
    case "true_false":
      return {
        ...common,
        type: "SINGLE_CHOICE",
        prompt: q.prompt,
        options: { kind: q.kind },
        answerKey: { kind: q.kind, correct: q.correct },
        explanation: q.explanation,
      };
    case "short_answer":
      return {
        ...common,
        type: "SHORT_TEXT",
        prompt: q.prompt,
        options: { kind: q.kind },
        answerKey: { kind: q.kind, expectedCriteria: q.expectedCriteria },
        explanation: null,
      };
    case "scenario":
      return {
        ...common,
        type: "LONG_TEXT",
        prompt: q.task,
        options: { kind: q.kind, scenario: q.scenario },
        answerKey: { kind: q.kind, expectedCriteria: q.expectedCriteria },
        explanation: null,
      };
    case "practical_task":
      return {
        ...common,
        type: "LONG_TEXT",
        prompt: q.description,
        options: { kind: q.kind, requirements: q.requirements, deliverables: q.deliverables },
        answerKey: { kind: q.kind, evaluationCriteria: q.evaluationCriteria },
        explanation: null,
      };
  }
}

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Rebuilds an author-facing question from a row. Returns null for a row that is not valid (for example, hand-edited data). */
export function decodeQuestion(row: StoredQuestion): QuestionContent | null {
  const options = asRecord(row.options);
  const key = asRecord(row.answerKey);
  const kind = (options.kind ?? key.kind) as QuestionKind | undefined;
  const base = {
    kind,
    skillId: row.skillId,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimatedMinutes,
    explanation: row.explanation ?? undefined,
  };
  let candidate: Record<string, unknown>;
  switch (kind) {
    case "multiple_choice":
      candidate = { ...base, prompt: row.prompt, choices: options.choices, correctChoiceId: key.correctChoiceId };
      break;
    case "multiple_select":
      candidate = { ...base, prompt: row.prompt, choices: options.choices, correctChoiceIds: key.correctChoiceIds };
      break;
    case "true_false":
      candidate = { ...base, prompt: row.prompt, correct: key.correct };
      break;
    case "short_answer":
      candidate = { ...base, prompt: row.prompt, expectedCriteria: key.expectedCriteria };
      break;
    case "scenario":
      candidate = { ...base, scenario: options.scenario, task: row.prompt, expectedCriteria: key.expectedCriteria };
      break;
    case "practical_task":
      candidate = {
        ...base,
        description: row.prompt,
        requirements: options.requirements,
        deliverables: options.deliverables,
        evaluationCriteria: key.evaluationCriteria,
      };
      break;
    default:
      return null;
  }
  const parsed = questionContentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** What a candidate would see: no correct answers, explanations or evaluation criteria. */
export type CandidateQuestion =
  | { kind: "multiple_choice" | "multiple_select"; prompt: string; choices: { id: string; text: string }[] }
  | { kind: "true_false" | "short_answer"; prompt: string }
  | { kind: "scenario"; scenario: string; task: string }
  | { kind: "practical_task"; description: string; requirements: string[]; deliverables: string[] };

export function toCandidateQuestion(q: QuestionContent): CandidateQuestion {
  switch (q.kind) {
    case "multiple_choice":
    case "multiple_select":
      return { kind: q.kind, prompt: q.prompt, choices: q.choices.map((c) => ({ id: c.id, text: c.text })) };
    case "true_false":
    case "short_answer":
      return { kind: q.kind, prompt: q.prompt };
    case "scenario":
      return { kind: q.kind, scenario: q.scenario, task: q.task };
    case "practical_task":
      return {
        kind: q.kind,
        description: q.description,
        requirements: q.requirements,
        deliverables: q.deliverables,
      };
  }
}
