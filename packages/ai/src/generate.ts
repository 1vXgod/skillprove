import { checkGeneratedAgainstRequest, findUnsafeText, questionText } from "@skillprove/assessment-engine";
import {
  generatedAssessmentSchema,
  generatedQuestionSchema,
  type GeneratedAssessment,
  type GenerationRequest,
  type QuestionContent,
} from "@skillprove/validation";
import { AiProviderError, type AiProvider, type AiUsage } from "./provider";
import { buildGenerationPrompt, buildQuestionPrompt, buildRepairPrompt, SYSTEM_PROMPT, type PromptSkill } from "./prompts";

/** Stable codes stored on the job and shown to clients. They never contain provider text or generated content. */
export type GenerationErrorCode =
  | "provider_timeout"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_blocked"
  | "provider_misconfigured"
  | "invalid_output"
  | "cancelled";

export class GenerationError extends Error {
  constructor(
    readonly code: GenerationErrorCode,
    /** Tokens already spent before failing, so cost is recorded even for failed jobs. */
    readonly usage: AiUsage,
    /** Provider calls made. */
    readonly attempts: number,
  ) {
    super(`Generation failed: ${code}`);
    this.name = "GenerationError";
  }
}

export interface RunOptions {
  provider: AiProvider;
  /** Total provider calls allowed, including repair attempts. Never retried beyond this. */
  maxAttempts: number;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Waits between retries of transient errors. Replaceable so tests need no real delay. */
  sleep?: (ms: number) => Promise<void>;
}

export interface GenerationOutcome<T> {
  value: T;
  usage: AiUsage;
  attempts: number;
  /** The model whose answer was accepted. */
  model: string;
}

const PROVIDER_CODE_MAP = {
  timeout: "provider_timeout",
  unavailable: "provider_unavailable",
  rate_limited: "provider_rate_limited",
  blocked: "provider_blocked",
  misconfigured: "provider_misconfigured",
  cancelled: "cancelled",
} as const satisfies Record<string, GenerationErrorCode>;

function addUsage(total: AiUsage, next: AiUsage): AiUsage {
  const add = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));
  return { inputTokens: add(total.inputTokens, next.inputTokens), outputTokens: add(total.outputTokens, next.outputTokens) };
}

/** Pulls a JSON value out of model text, tolerating a markdown fence around it. */
export function parseJsonText(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

/**
 * The shared loop: call the provider, parse, validate, and on a rejected answer ask once more with
 * only the problem codes (never the rejected content). Stops after `maxAttempts` calls in total.
 */
async function runValidated<T>(
  options: RunOptions,
  basePrompt: string,
  validate: (json: unknown) => { ok: true; value: T } | { ok: false; problems: string[] },
): Promise<GenerationOutcome<T>> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let usage: AiUsage = { inputTokens: null, outputTokens: null };
  let prompt = basePrompt;
  let attempts = 0;
  let lastError: GenerationError | null = null;
  let model = options.provider.model;

  while (attempts < options.maxAttempts) {
    if (options.signal?.aborted) throw new GenerationError("cancelled", usage, attempts);
    attempts += 1;

    let text: string;
    try {
      const response = await options.provider.generateJson({
        system: SYSTEM_PROMPT,
        prompt,
        timeoutMs: options.timeoutMs,
        signal: options.signal,
      });
      usage = addUsage(usage, response.usage);
      text = response.text;
      model = response.model ?? options.provider.model;
    } catch (error) {
      if (!(error instanceof AiProviderError)) throw new GenerationError("provider_unavailable", usage, attempts);
      lastError = new GenerationError(PROVIDER_CODE_MAP[error.code], usage, attempts);
      if (!error.retryable || attempts >= options.maxAttempts) throw lastError;
      await sleep(Math.min(250 * 2 ** (attempts - 1), 2_000));
      continue;
    }

    let problems: string[];
    try {
      const result = validate(parseJsonText(text));
      if (result.ok) return { value: result.value, usage, attempts, model };
      problems = result.problems;
    } catch {
      problems = ["notValidJson"];
    }
    lastError = new GenerationError("invalid_output", usage, attempts);
    prompt = buildRepairPrompt(basePrompt, problems);
  }
  throw lastError ?? new GenerationError("invalid_output", usage, attempts);
}

function schemaProblems(error: { issues: readonly { path: PropertyKey[]; message: string }[] }): string[] {
  // Paths and validation keys only: the rejected content itself is never echoed back.
  return [...new Set(error.issues.slice(0, 12).map((i) => `${i.path.map(String).join(".") || "root"}:${i.message}`))];
}

export function generateAssessment(
  options: RunOptions,
  request: GenerationRequest,
  skills: readonly PromptSkill[],
): Promise<GenerationOutcome<GeneratedAssessment>> {
  return runValidated(options, buildGenerationPrompt(request, skills), (json) => {
    const parsed = generatedAssessmentSchema.safeParse(json);
    if (!parsed.success) return { ok: false, problems: schemaProblems(parsed.error) };
    const problems = checkGeneratedAgainstRequest(parsed.data, request);
    return problems.length ? { ok: false, problems } : { ok: true, value: parsed.data };
  });
}

export function regenerateQuestion(
  options: RunOptions,
  request: Pick<GenerationRequest, "language" | "difficulty" | "assessmentType" | "additionalInstructions">,
  skills: readonly PromptSkill[],
  target: { kind: QuestionContent["kind"]; skillId: string; currentQuestionSummary: string },
): Promise<GenerationOutcome<QuestionContent>> {
  const allowed = new Set(skills.map((s) => s.id));
  return runValidated(options, buildQuestionPrompt(request, skills, target), (json) => {
    const parsed = generatedQuestionSchema.safeParse(json);
    if (!parsed.success) return { ok: false, problems: schemaProblems(parsed.error) };
    const q = parsed.data.question;
    const problems: string[] = [];
    if (q.kind !== target.kind) problems.push("kindMismatch");
    if (!allowed.has(q.skillId)) problems.push("unknownSkill");
    if (findUnsafeText(questionText(q))) problems.push("unsafeContent");
    return problems.length ? { ok: false, problems } : { ok: true, value: q };
  });
}
