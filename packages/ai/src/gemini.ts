import { AiProviderError, type AiJsonRequest, type AiJsonResponse, type AiProvider } from "./provider";

export interface GeminiOptions {
  apiKey: string;
  model: string;
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

  constructor(options: GeminiOptions) {
    if (!options.apiKey) throw new AiProviderError("misconfigured", false);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.fetchImpl = options.fetch ?? fetch;
  }

  async generateJson(request: AiJsonRequest): Promise<AiJsonResponse> {
    const timeout = AbortSignal.timeout(request.timeoutMs);
    const signal = request.signal ? AbortSignal.any([timeout, request.signal]) : timeout;

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
        signal,
      });
    } catch {
      if (request.signal?.aborted) throw new AiProviderError("cancelled", false);
      if (timeout.aborted) throw new AiProviderError("timeout", true);
      throw new AiProviderError("unavailable", true);
    }

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
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? null,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
      },
    };
  }
}
