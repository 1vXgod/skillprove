import {
  ASSESSMENT_DIFFICULTIES,
  ASSESSMENT_LANGUAGES,
  ASSESSMENT_LIMITS as L,
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
  AI_JOB_STATUSES,
} from "@skillprove/shared";
import { z } from "zod";

// Messages are validation keys (see candidate.ts), so clients show the same translated text.
const text = (max: number) => z.string("required").trim().min(1, "required").max(max, "tooLong");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .nullish()
    .transform((v) => (v ? v : null));
const textList = (maxItems: number = L.maxListItems) => z.array(text(L.listItemMax)).min(1, "required").max(maxItems, "tooMany");

export const difficultySchema = z.enum(ASSESSMENT_DIFFICULTIES, "invalidChoice");
export const assessmentTypeSchema = z.enum(ASSESSMENT_TYPES, "invalidChoice");
export const assessmentLanguageSchema = z.enum(ASSESSMENT_LANGUAGES, "invalidChoice");
const durationSchema = z
  .number("invalidNumber")
  .int("invalidNumber")
  .min(L.minDurationMinutes, "invalidNumber")
  .max(L.maxDurationMinutes, "invalidNumber");

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const choiceSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "required")
    .max(20, "tooLong")
    .regex(/^[A-Za-z0-9_-]+$/, "invalidChoice"),
  text: text(L.choiceTextMax),
});
const choicesSchema = (min: number) =>
  z
    .array(choiceSchema)
    .min(min, "required")
    .max(L.maxChoices, "tooMany")
    .refine((choices) => new Set(choices.map((c) => c.id)).size === choices.length, "duplicateKey");

const questionBase = {
  skillId: z.uuid("required"),
  difficulty: difficultySchema,
  estimatedMinutes: z.number("invalidNumber").int("invalidNumber").min(1, "invalidNumber").max(120, "invalidNumber"),
};
/** Objective questions explain why the answer is right; subjective ones state criteria instead. */
const objectiveBase = { ...questionBase, explanation: text(L.explanationMax) };

export const multipleChoiceSchema = z
  .object({
    kind: z.literal("multiple_choice"),
    prompt: text(L.promptMax),
    choices: choicesSchema(L.minChoices),
    correctChoiceId: z.string("needsCorrectAnswer"),
    ...objectiveBase,
  })
  .refine((q) => q.choices.some((c) => c.id === q.correctChoiceId), {
    path: ["correctChoiceId"],
    message: "needsCorrectAnswer",
  });

export const multipleSelectSchema = z
  .object({
    kind: z.literal("multiple_select"),
    prompt: text(L.promptMax),
    choices: choicesSchema(3),
    correctChoiceIds: z.array(z.string()).min(1, "needsCorrectAnswer"),
    ...objectiveBase,
  })
  .refine(
    (q) =>
      new Set(q.correctChoiceIds).size === q.correctChoiceIds.length &&
      q.correctChoiceIds.every((id) => q.choices.some((c) => c.id === id)) &&
      q.correctChoiceIds.length < q.choices.length,
    { path: ["correctChoiceIds"], message: "needsCorrectAnswer" },
  );

export const trueFalseSchema = z.object({
  kind: z.literal("true_false"),
  prompt: text(L.promptMax),
  correct: z.boolean("needsCorrectAnswer"),
  ...objectiveBase,
});

export const shortAnswerSchema = z.object({
  kind: z.literal("short_answer"),
  prompt: text(L.promptMax),
  expectedCriteria: textList(),
  ...questionBase,
});

export const scenarioSchema = z.object({
  kind: z.literal("scenario"),
  scenario: text(L.scenarioMax),
  task: text(L.promptMax),
  expectedCriteria: textList(),
  ...questionBase,
});

/** Defines the task only. Nothing a candidate submits is ever executed. */
export const practicalTaskSchema = z.object({
  kind: z.literal("practical_task"),
  description: text(L.scenarioMax),
  requirements: textList(),
  deliverables: textList(),
  evaluationCriteria: textList(),
  ...questionBase,
});

/** One question as an author sees and edits it. Unknown fields are dropped. */
export const questionContentSchema = z.union([
  multipleChoiceSchema,
  multipleSelectSchema,
  trueFalseSchema,
  shortAnswerSchema,
  scenarioSchema,
  practicalTaskSchema,
]);
export type QuestionContent = z.infer<typeof questionContentSchema>;

export type Question = QuestionContent & { id: string; position: number };
export const questionSchema = questionContentSchema.and(z.object({ id: z.uuid(), position: z.number().int().min(1) }));

export const questionReorderSchema = z.object({
  questionIds: z
    .array(z.uuid())
    .min(1)
    .max(L.maxQuestions)
    .refine((ids) => new Set(ids).size === ids.length, "duplicateKey"),
});

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export const rubricCriterionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "required")
    .max(40, "tooLong")
    .regex(/^[a-z0-9_-]+$/, "invalidChoice"),
  title: text(120),
  description: text(L.promptMax),
  maxScore: z.number("invalidNumber").int("invalidNumber").min(1, "invalidNumber").max(100, "invalidNumber"),
  /** Percent of the overall rubric. All criteria together must be exactly 100. */
  weight: z.number("invalidNumber").gt(0, "invalidNumber").max(100, "invalidNumber"),
  scoringGuidance: text(L.promptMax),
  skillId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
});

/** Weights are compared in hundredths, so 33.33 + 33.33 + 33.34 is valid and floating-point drift is not. */
export function weightsTotal100(criteria: readonly { weight: number }[]): boolean {
  return Math.round(criteria.reduce((sum, c) => sum + c.weight * 100, 0)) === 10_000;
}

export const rubricCriteriaSchema = z
  .array(rubricCriterionSchema)
  .min(1, "required")
  .max(L.maxRubricCriteria, "tooMany")
  .refine((c) => new Set(c.map((x) => x.key)).size === c.length, "duplicateKey");

export const rubricInputSchema = z.object({ criteria: rubricCriteriaSchema }).refine((r) => weightsTotal100(r.criteria), {
  path: ["criteria"],
  message: "weightsMustTotal100",
});
export type RubricInput = z.infer<typeof rubricInputSchema>;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const skillIdsSchema = z
  .array(z.uuid("invalidChoice"))
  .min(1, "required")
  .max(L.maxSkills, "tooMany")
  .refine((ids) => new Set(ids).size === ids.length, "duplicate");

export const manualAssessmentInputSchema = z.object({
  title: text(L.titleMax),
  description: optionalText(L.descriptionMax),
  instructions: optionalText(L.instructionsMax),
  skillIds: skillIdsSchema,
  difficulty: difficultySchema,
  assessmentType: assessmentTypeSchema,
  durationMinutes: durationSchema,
  language: assessmentLanguageSchema,
});
export type ManualAssessmentInput = z.infer<typeof manualAssessmentInputSchema>;

export const assessmentUpdateSchema = z.object({
  title: text(L.titleMax).optional(),
  description: optionalText(L.descriptionMax).optional(),
  instructions: optionalText(L.instructionsMax).optional(),
  skillIds: skillIdsSchema.optional(),
  difficulty: difficultySchema.optional(),
  assessmentType: assessmentTypeSchema.optional(),
  durationMinutes: durationSchema.optional(),
  language: assessmentLanguageSchema.optional(),
  /** The draft's `updatedAt` as the client last saw it. A mismatch means someone else saved first. */
  expectedUpdatedAt: z.iso.datetime(),
});
export type AssessmentUpdate = z.infer<typeof assessmentUpdateSchema>;

export const generationRequestSchema = z.object({
  title: optionalText(L.titleMax),
  description: optionalText(L.descriptionMax),
  skills: z
    .array(z.object({ skillId: z.uuid("invalidChoice"), expectedLevel: difficultySchema }))
    .min(1, "required")
    .max(L.maxSkills, "tooMany")
    .refine((s) => new Set(s.map((x) => x.skillId)).size === s.length, "duplicate"),
  difficulty: difficultySchema,
  assessmentType: assessmentTypeSchema,
  questionCount: z
    .number("invalidNumber")
    .int("invalidNumber")
    .min(L.minQuestions, "invalidNumber")
    .max(L.maxQuestions, "invalidNumber"),
  durationMinutes: durationSchema,
  language: assessmentLanguageSchema,
  additionalInstructions: optionalText(L.additionalInstructionsMax),
});
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

export const questionRegenerationSchema = z.object({
  additionalInstructions: optionalText(L.additionalInstructionsMax),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(L.idempotencyKeyMin)
  .max(L.idempotencyKeyMax)
  .regex(/^[A-Za-z0-9_.:-]+$/);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(L.pageSizeMax).default(L.pageSizeDefault),
});

export const assessmentListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ASSESSMENT_STATUSES).optional(),
});

// ---------------------------------------------------------------------------
// What the AI may return. Everything is validated; nothing here is a score.
// ---------------------------------------------------------------------------

export const generatedAssessmentSchema = z.object({
  title: text(L.titleMax),
  description: text(L.descriptionMax),
  instructions: text(L.instructionsMax),
  questions: z.array(questionContentSchema).min(L.minQuestions).max(L.maxQuestions),
  rubric: rubricInputSchema,
});
export type GeneratedAssessment = z.infer<typeof generatedAssessmentSchema>;

export const generatedQuestionSchema = z.object({ question: questionContentSchema });

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export const assessmentSkillRefSchema = z.object({ skillId: z.uuid(), name: z.string(), weight: z.number() });

export const assessmentVersionSummarySchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  status: z.enum(ASSESSMENT_STATUSES),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AssessmentVersionSummary = z.infer<typeof assessmentVersionSummarySchema>;

export const rubricSchema = z.object({
  id: z.uuid(),
  version: z.number().int(),
  published: z.boolean(),
  criteria: z.array(rubricCriterionSchema.extend({ id: z.uuid() })),
});
export type Rubric = z.infer<typeof rubricSchema>;

export const assessmentDetailSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid().nullable(),
  creationSource: z.enum(["HUMAN", "AI_GENERATED"]),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  language: z.string(),
  difficulty: z.string(),
  assessmentType: z.enum(ASSESSMENT_TYPES).nullable(),
  durationMinutes: z.number().int().nullable(),
  /** The version shown: the open draft if there is one, else the latest published version. */
  version: assessmentVersionSummarySchema,
  hasOpenDraft: z.boolean(),
  hasPublishedVersion: z.boolean(),
  skills: z.array(assessmentSkillRefSchema),
  questions: z.array(questionSchema),
  rubric: rubricSchema.nullable(),
  aiJobId: z.uuid().nullable(),
  /** Issues that block publishing, as validation keys. Empty means the draft can be published. */
  publishIssues: z.array(z.string()),
});
export type AssessmentDetail = z.infer<typeof assessmentDetailSchema>;

export const assessmentListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  language: z.string(),
  difficulty: z.string(),
  assessmentType: z.enum(ASSESSMENT_TYPES).nullable(),
  status: z.enum(ASSESSMENT_STATUSES),
  version: z.number().int(),
  creationSource: z.enum(["HUMAN", "AI_GENERATED"]),
  questionCount: z.number().int(),
  updatedAt: z.iso.datetime(),
});
export type AssessmentListItem = z.infer<typeof assessmentListItemSchema>;

export const assessmentListSchema = z.object({
  items: z.array(assessmentListItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type AssessmentList = z.infer<typeof assessmentListSchema>;

export const aiJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(AI_JOB_STATUSES),
  assessmentId: z.uuid().nullable(),
  retryCount: z.number().int(),
  /** Stable code only. Provider messages are never exposed. */
  errorCode: z.string().nullable(),
  inputTokens: z.number().int().nullable(),
  outputTokens: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
});
export type AiJob = z.infer<typeof aiJobSchema>;

export const versionListSchema = z.object({ items: z.array(assessmentVersionSummarySchema) });
export type VersionList = z.infer<typeof versionListSchema>;
export const publishResultSchema = z.object({ versionId: z.uuid(), version: z.number().int() });

export const candidatePreviewQuestionSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  kind: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer", "scenario", "practical_task"]),
  prompt: z.string().optional(),
  choices: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  scenario: z.string().optional(),
  task: z.string().optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
});

/** The candidate-facing view. It deliberately has no field for answers, explanations or criteria. */
export const assessmentPreviewSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
  language: z.string(),
  questions: z.array(candidatePreviewQuestionSchema),
});
export type AssessmentPreview = z.infer<typeof assessmentPreviewSchema>;

export const generationStartSchema = z.object({ job: aiJobSchema, reused: z.boolean() });
export type GenerationStart = z.infer<typeof generationStartSchema>;
