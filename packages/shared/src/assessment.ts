/** Constants for assessment authoring. The UI offers three difficulties; the database also has EXPERT. */
export const ASSESSMENT_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type AssessmentDifficulty = (typeof ASSESSMENT_DIFFICULTIES)[number];

export const ASSESSMENT_TYPES = ["KNOWLEDGE", "PRACTICAL", "SCENARIO_BASED"] as const;
export type AssessmentTypeName = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_LANGUAGES = ["sq", "en"] as const;
export type AssessmentLanguage = (typeof ASSESSMENT_LANGUAGES)[number];

/** The question kinds authors see. Several share one database `QuestionType`; see the assessment-engine codec. */
export const QUESTION_KINDS = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "short_answer",
  "scenario",
  "practical_task",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/** Kinds with an objectively correct answer. Only these carry an explanation of the correct answer. */
export const OBJECTIVE_QUESTION_KINDS: readonly QuestionKind[] = ["multiple_choice", "multiple_select", "true_false"];

export const ASSESSMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

/** Mirrors the database `AttemptStatus`. */
export const ATTEMPT_STATUSES = ["IN_PROGRESS", "SUBMITTED", "EXPIRED", "ABANDONED"] as const;
export type AttemptStatusName = (typeof ATTEMPT_STATUSES)[number];

/**
 * Submissions are accepted this long after the deadline, to absorb network delay. Server side
 * only: candidates are always shown the exact deadline.
 */
export const SUBMISSION_GRACE_SECONDS = 30;

/**
 * Scoring runs right after a submit. If a submitted attempt still has no result this long
 * afterwards, the run was probably lost, so reading the result starts it again.
 */
export const SCORING_RETRY_AFTER_SECONDS = 60;

/** `pending`: still being scored. `scored`: results are ready. `failed`: it cannot be scored automatically. */
export const ATTEMPT_RESULT_STATES = ["pending", "scored", "failed"] as const;
export type AttemptResultState = (typeof ATTEMPT_RESULT_STATES)[number];

export const AI_JOB_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export const ASSESSMENT_LIMITS = {
  titleMax: 160,
  descriptionMax: 2000,
  instructionsMax: 4000,
  additionalInstructionsMax: 1000,
  minQuestions: 1,
  maxQuestions: 30,
  maxSkills: 8,
  minDurationMinutes: 5,
  maxDurationMinutes: 240,
  promptMax: 2000,
  scenarioMax: 3000,
  choiceTextMax: 300,
  minChoices: 2,
  maxChoices: 8,
  choiceIdMax: 20,
  listItemMax: 400,
  maxListItems: 10,
  explanationMax: 1500,
  maxRubricCriteria: 12,
  idempotencyKeyMin: 8,
  idempotencyKeyMax: 100,
  pageSizeMax: 50,
  pageSizeDefault: 20,
} as const;

/** Choice IDs, as authors write them and candidates send them back. */
export const CHOICE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Defaults for the generation limits. The API reads overrides from its environment. */
export const GENERATION_LIMIT_DEFAULTS = {
  perUserPerDay: 10,
  perCompanyPerDay: 40,
  maxConcurrentPerCompany: 3,
  providerTimeoutMs: 45_000,
  maxProviderAttempts: 3,
  maxJobRetries: 2,
} as const;
