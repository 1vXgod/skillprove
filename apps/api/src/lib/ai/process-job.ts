import {
  estimateCostUsd,
  generateAssessment,
  GenerationError,
  regenerateQuestion,
  type GenerationErrorCode,
} from "@skillprove/ai";
import { decodeQuestion, encodeQuestion, questionText } from "@skillprove/assessment-engine";
import {
  claimJob,
  completeJob,
  createAssessment,
  failJob,
  getAssessment,
  getJob,
  getSkillNames,
  recordUsageOnly,
  replaceQuestionIfDraft,
  softDeleteAssessment,
  type PrismaClient,
} from "@skillprove/database";
import { generationRequestSchema, type GenerationRequest } from "@skillprove/validation";
import { z } from "zod";
import { getEnv } from "../env";
import { getAiProvider, getPricing } from "./provider";

/** What a job stores as input. Validated again when the job runs, so a stored row is never trusted blindly. */
export const jobInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assessment"), request: generationRequestSchema }),
  z.object({
    kind: z.literal("question"),
    assessmentId: z.uuid(),
    questionId: z.uuid(),
    additionalInstructions: z.string().max(1000).nullable(),
  }),
]);
export type JobInput = z.infer<typeof jobInputSchema>;

/** Fixed, safe text per code. This is all a client or a database row ever sees about a failure. */
const FAILURE_MESSAGES: Record<GenerationErrorCode | "internal" | "invalid_job" | "timeout", string> = {
  provider_timeout: "The AI service took too long to answer.",
  provider_unavailable: "The AI service is unavailable.",
  provider_rate_limited: "The AI service is busy.",
  provider_blocked: "The AI service declined this request.",
  provider_misconfigured: "AI generation is not available.",
  invalid_output: "The AI did not produce a valid assessment.",
  cancelled: "The job was cancelled.",
  internal: "Something went wrong.",
  invalid_job: "The job could not be read.",
  timeout: "The job took too long.",
};
export const failureMessage = (code: string) => (code in FAILURE_MESSAGES ? FAILURE_MESSAGES[code as keyof typeof FAILURE_MESSAGES] : FAILURE_MESSAGES.internal);

/** The longest a RUNNING job can legitimately last: every attempt hitting the timeout, plus slack. */
export function staleJobAfterMs() {
  const env = getEnv();
  return env.GENERATION_PROVIDER_TIMEOUT_MS * env.GENERATION_MAX_PROVIDER_ATTEMPTS + 30_000;
}

/** Which model answered: IDs and model names only, never content. */
function logAnsweringModel(jobId: string, configured: string, answered: string) {
  const fallback = answered !== configured;
  console.info("AI job answered", JSON.stringify({ jobId, model: answered, ...(fallback ? { fallbackFrom: configured } : {}) }));
}

export interface ProcessDeps {
  /** Replaceable in tests. */
  sleep?: (ms: number) => Promise<void>;
}

/** Runs one queued job to completion. Safe to call twice: only one call can claim the job. */
export async function processGenerationJob(db: PrismaClient, jobId: string, deps: ProcessDeps = {}) {
  if (!(await claimJob(db, jobId))) return;
  const job = await getJob(db, jobId);
  if (!job || !job.companyId || !job.requestedById) return;
  const companyId = job.companyId;
  const userId = job.requestedById;
  const env = getEnv();

  const noUsage = { inputTokens: null, outputTokens: null, estimatedCost: null };
  const fail = (code: string) => failJob(db, jobId, { code, message: failureMessage(code) }, noUsage);

  const input = jobInputSchema.safeParse(job.input);
  if (!input.success) {
    await fail("invalid_job");
    return;
  }
  const provider = getAiProvider();
  if (!provider) {
    await fail("provider_misconfigured");
    return;
  }

  const controller = new AbortController();
  const options = {
    provider,
    maxAttempts: env.GENERATION_MAX_PROVIDER_ATTEMPTS,
    timeoutMs: env.GENERATION_PROVIDER_TIMEOUT_MS,
    signal: controller.signal,
    sleep: deps.sleep,
  };
  const usageOf = (usage: { inputTokens: number | null; outputTokens: number | null }) => ({
    ...usage,
    estimatedCost: estimateCostUsd(usage, getPricing()),
  });

  try {
    if (input.data.kind === "assessment") {
      const request = input.data.request;
      const names = await getSkillNames(db, request.skills.map((s) => s.skillId), request.language);
      const promptSkills = request.skills.map((s) => ({
        id: s.skillId,
        name: names.find((n) => n.id === s.skillId)?.name ?? "Skill",
        expectedLevel: s.expectedLevel,
      }));
      const { value, usage, model } = await generateAssessment(options, request, promptSkills);
      logAnsweringModel(jobId, provider.model, model);

      // A job cancelled while the provider was working is discarded, but its spend is still recorded.
      const current = await getJob(db, jobId);
      if (current?.status !== "RUNNING") {
        await recordUsageOnly(db, jobId, usageOf(usage));
        return;
      }
      const assessmentId = await createAssessment(db, {
        companyId,
        userId,
        source: "AI_GENERATED",
        aiJobId: jobId,
        meta: {
          title: request.title ?? value.title,
          description: request.description ?? value.description,
          instructions: value.instructions,
          language: request.language,
          difficulty: request.difficulty,
          assessmentType: request.assessmentType,
          durationMinutes: request.durationMinutes,
        },
        skillIds: request.skills.map((s) => s.skillId),
        questions: value.questions.map(encodeQuestion) as never,
        criteria: value.rubric.criteria.map((c) => ({ ...c, skillId: c.skillId ?? null })),
      });
      if (!(await completeJob(db, jobId, usageOf(usage), assessmentId, model))) {
        await softDeleteAssessment(db, companyId, assessmentId, userId);
        await recordUsageOnly(db, jobId, usageOf(usage));
      }
      return;
    }

    // Regenerating one question in an open draft.
    const target = input.data;
    const record = await getAssessment(db, companyId, target.assessmentId);
    const row = record.working.questions.find((q) => q.id === target.questionId);
    const content = row ? decodeQuestion(row) : null;
    if (!row || !content || record.working.status !== "DRAFT") {
      await fail("invalid_job");
      return;
    }
    const skillIds = record.working.skills.map((s) => s.skillId);
    const names = await getSkillNames(db, skillIds, record.working.language === "en" ? "en" : "sq");
    const promptSkills = names.map((n) => ({ id: n.id, name: n.name, expectedLevel: record.working.difficulty }));
    const language: GenerationRequest["language"] = record.working.language === "en" ? "en" : "sq";
    const difficulty = (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).find((d) => d === record.working.difficulty) ?? "INTERMEDIATE";
    const { value, usage, model } = await regenerateQuestion(
      options,
      { language, difficulty, assessmentType: record.working.assessmentType ?? "KNOWLEDGE", additionalInstructions: target.additionalInstructions },
      promptSkills,
      { kind: content.kind, skillId: content.skillId, currentQuestionSummary: questionText(content) },
    );
    logAnsweringModel(jobId, provider.model, model);
    const current = await getJob(db, jobId);
    if (current?.status !== "RUNNING") {
      await recordUsageOnly(db, jobId, usageOf(usage));
      return;
    }
    const replaced = await replaceQuestionIfDraft(db, companyId, target.assessmentId, target.questionId, encodeQuestion(value) as never);
    if (!replaced) await failJob(db, jobId, { code: "invalid_job", message: failureMessage("invalid_job") }, usageOf(usage));
    else await completeJob(db, jobId, usageOf(usage), target.assessmentId, model);
  } catch (error) {
    if (error instanceof GenerationError) {
      await failJob(db, jobId, { code: error.code, message: failureMessage(error.code) }, usageOf(error.usage));
    } else {
      // Unexpected: log a redacted description (never content) and store only a generic code.
      const { describeError } = await import("../http");
      console.error("Generation job crashed", JSON.stringify(describeError(error)));
      await fail("internal");
    }
  }
}
