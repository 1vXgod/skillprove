import {
  ASSESSMENT_LIMITS as L,
  ATTEMPT_RESULT_STATES,
  ATTEMPT_STATUSES,
  CHOICE_ID_PATTERN,
  DIFFICULTY_LEVELS,
} from "@skillprove/shared";
import { z } from "zod";

/*
 * Candidates taking assessments (Milestone 7). Only objective questions can be taken for now.
 * None of these schemas has a field for correct answers, explanations, evaluation criteria
 * or a score the client could send: scores are computed on the server from stored answers.
 */

// ---- Requests ----------------------------------------------------------------------------

const choiceId = z
  .string("invalidChoice")
  .min(1, "invalidChoice")
  .max(L.choiceIdMax, "invalidChoice")
  .regex(CHOICE_ID_PATTERN, "invalidChoice");

/**
 * One answer: a choice ID (multiple choice), a boolean (true/false) or a list of distinct
 * choice IDs (multiple select). Whether it fits its question is checked on the server against
 * the stored question; a wrong shape is scored as wrong rather than rejected.
 */
export const attemptAnswerSchema = z.union([
  choiceId,
  z.boolean("invalidChoice"),
  z
    .array(choiceId)
    .max(L.maxChoices, "tooMany")
    .refine((ids) => new Set(ids).size === ids.length, "duplicateKey"),
]);
export type AttemptAnswer = z.infer<typeof attemptAnswerSchema>;

/** Answers keyed by question ID. Unanswered questions are simply left out. */
export const attemptAnswersSchema = z
  .record(z.uuid("invalidChoice"), attemptAnswerSchema)
  .refine((answers) => Object.keys(answers).length <= L.maxQuestions, "tooMany");
export type AttemptAnswers = z.infer<typeof attemptAnswersSchema>;

/** Body of `POST /me/attempts/:attemptId/submit`. Unknown fields, such as a score, are dropped. */
export const attemptSubmitSchema = z.object({ answers: attemptAnswersSchema });
export type AttemptSubmit = z.infer<typeof attemptSubmitSchema>;

// ---- Responses ---------------------------------------------------------------------------

const attemptStatusSchema = z.enum(ATTEMPT_STATUSES);
const difficultySchema = z.enum(DIFFICULTY_LEVELS);
const skillRefSchema = z.object({ skillId: z.uuid(), name: z.string() });

/** One entry in the list of assessments a candidate can take. */
export const takeableAssessmentSchema = z.object({
  assessmentId: z.uuid(),
  versionId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  language: z.string(),
  difficulty: difficultySchema,
  durationMinutes: z.number().int().nullable(),
  questionCount: z.number().int(),
  skills: z.array(skillRefSchema),
  maxAttempts: z.number().int(),
  attemptsUsed: z.number().int(),
  /** An attempt the candidate started and can still continue. */
  openAttemptId: z.uuid().nullable(),
});
export type TakeableAssessment = z.infer<typeof takeableAssessmentSchema>;

export const takeableAssessmentListSchema = z.object({ items: z.array(takeableAssessmentSchema) });
export type TakeableAssessmentList = z.infer<typeof takeableAssessmentListSchema>;

/** A question as the candidate sees it while taking an assessment. */
export const attemptQuestionSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.uuid(),
    position: z.number().int(),
    kind: z.literal("multiple_choice"),
    prompt: z.string(),
    choices: z.array(z.object({ id: z.string(), text: z.string() })),
  }),
  z.object({
    id: z.uuid(),
    position: z.number().int(),
    kind: z.literal("multiple_select"),
    prompt: z.string(),
    choices: z.array(z.object({ id: z.string(), text: z.string() })),
  }),
  z.object({ id: z.uuid(), position: z.number().int(), kind: z.literal("true_false"), prompt: z.string() }),
]);
export type AttemptQuestion = z.infer<typeof attemptQuestionSchema>;

/** An attempt as its candidate sees it. Questions are included only while it is in progress. */
export const candidateAttemptSchema = z.object({
  id: z.uuid(),
  assessmentId: z.uuid(),
  title: z.string(),
  instructions: z.string().nullable(),
  language: z.string(),
  difficulty: difficultySchema,
  status: attemptStatusSchema,
  attemptNumber: z.number().int(),
  maxAttempts: z.number().int(),
  startedAt: z.iso.datetime(),
  /** The server's deadline. The client may show a countdown, but only the server decides. */
  expiresAt: z.iso.datetime().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  questions: z.array(attemptQuestionSchema),
});
export type CandidateAttempt = z.infer<typeof candidateAttemptSchema>;

/**
 * What a candidate sees after submitting: overall and per-skill results, never which
 * questions were right, so the answer key cannot leak to the next candidate.
 */
export const attemptResultSchema = z.object({
  attemptId: z.uuid(),
  state: z.enum(ATTEMPT_RESULT_STATES),
  submittedAt: z.iso.datetime(),
  scoredAt: z.iso.datetime().nullable(),
  questionCount: z.number().int(),
  /** Null until scored. */
  percent: z.number().min(0).max(100).nullable(),
  skills: z.array(
    skillRefSchema.extend({
      questionCount: z.number().int(),
      answeredCount: z.number().int(),
      percent: z.number().min(0).max(100),
    }),
  ),
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;
