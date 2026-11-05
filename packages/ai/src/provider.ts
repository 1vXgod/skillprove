/** What the generation workflow needs from any AI provider. Gemini is the first implementation. */
export interface AiProvider {
  /** A short, stable name stored on jobs, such as "gemini". */
  readonly name: string;
  readonly model: string;
  /** Returns the model's raw JSON text. Callers validate it; a provider never decides what is acceptable. */
  generateJson(request: AiJsonRequest): Promise<AiJsonResponse>;
}

export interface AiJsonRequest {
  system: string;
  prompt: string;
  /** Hard limit for this one call. The provider must abort when it passes. */
  timeoutMs: number;
  /** Aborts the call early, for example when a job is cancelled. */
  signal?: AbortSignal;
}

export interface AiUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface AiJsonResponse {
  text: string;
  usage: AiUsage;
}

/** Safe, stable codes. A provider's own message text is never copied into an error, a log or a response. */
export type AiProviderErrorCode = "timeout" | "unavailable" | "rate_limited" | "blocked" | "misconfigured" | "cancelled";

export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    /** Whether trying the same request again could help. */
    readonly retryable: boolean,
  ) {
    super(`AI provider error: ${code}`);
    this.name = "AiProviderError";
  }
}

export interface TokenPricing {
  /** US dollars per million tokens. */
  inputPerMillion: number;
  outputPerMillion: number;
}

/** An estimate for display and limits, not an invoice. Returns null when usage or pricing is unknown. */
export function estimateCostUsd(usage: AiUsage, pricing: TokenPricing | null): number | null {
  if (!pricing || usage.inputTokens === null || usage.outputTokens === null) return null;
  const cost = (usage.inputTokens * pricing.inputPerMillion + usage.outputTokens * pricing.outputPerMillion) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
