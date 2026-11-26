import { AiProviderError, type AiJsonRequest, type AiJsonResponse, type AiProvider } from "./provider";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /**
   * Asks the model to reason less before answering (for example "low"), which makes long JSON
   * answers much faster. A model that rejects the level gets the request again without it.
   */
  thinkingLevel?: string;
  /**
   * Tried in order when a model answers 503 (busy), each at most once per call and all within
   * the call's one timeout. Duplicates of `model` are ignored.
   */
  fallbackModels?: readonly string[];
  /** Overridable for tests. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

interface GeminiBody {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Calls Gemini's REST API. The key goes only in a request header, never in a URL, log or error,
 * and no part of the provider's response body is copied into an error.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly fallbackModels: readonly string[];
  /** Cleared once the model rejects it, so later calls skip the rejected request. */
  private thinkingLevel: string | undefined;

  constructor(options: GeminiOptions) {
    if (!options.apiKey) throw new AiProviderError("misconfigured", false);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.fetchImpl = options.fetch ?? fetch;
    this.thinkingLevel = options.thinkingLevel;
    this.fallbackModels = [...new Set(options.fallbackModels ?? [])].filter((m) => m && m !== options.model);
  }

  async generateJson(request: AiJsonRequest): Promise<AiJsonResponse> {
    const timeout = AbortSignal.timeout(request.timeoutMs);
    const signal = request.signal ? AbortSignal.any([timeout, request.signal]) : timeout;

    const send = (model: string, thinkingLevel: string | undefined) =>
      this.fetchImpl(`${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          },
        }),
        signal,
      });

    const models = [this.model, ...this.fallbackModels];
    let response: Response | undefined;
    let model = this.model;
    try {
      for (const [index, candidate] of models.entries()) {
        model = candidate;
        const thinkingLevel = this.thinkingLevel;
        response = await send(model, thinkingLevel);
        // A 400 with a thinking level means the model does not support that level. Ask again
        // without it, within the same timeout, and stop sending it.
        if (response.status === 400 && thinkingLevel) {
          this.thinkingLevel = undefined;
          response = await send(model, undefined);
        }
        // 503: this model is busy. Try the next one, if there is one.
        if (response.status !== 503 || index === models.length - 1) break;
      }
    } catch {
      if (request.signal?.aborted) throw new AiProviderError("cancelled", false);
      if (timeout.aborted) throw new AiProviderError("timeout", true);
      throw new AiProviderError("unavailable", true);
    }
    if (!response) throw new AiProviderError("unavailable", true);

    if (response.status === 429) throw new AiProviderError("rate_limited", true);
    if (response.status === 401 || response.status === 403) throw new AiProviderError("misconfigured", false);
    if (!response.ok) throw new AiProviderError("unavailable", response.status >= 500);

    let body: GeminiBody;
    try {
      body = (await response.json()) as GeminiBody;
    } catch {
      throw new AiProviderError("unavailable", true);
    }
    if (body.promptFeedback?.blockReason) throw new AiProviderError("blocked", false);
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") throw new AiProviderError("blocked", false);

    const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return {
      text,
      model,
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? null,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
      },
    };
  }
}
