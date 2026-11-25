import { GeminiProvider, type AiProvider, type TokenPricing } from "@skillprove/ai";
import { getEnv } from "../env";

/**
 * The one place a provider is chosen. Business logic depends on `AiProvider` only, so swapping
 * providers means changing this function. Returns null when no key is configured, and the key
 * never leaves the API process.
 */
export function getAiProvider(): AiProvider | null {
  const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_THINKING_LEVEL } = getEnv();
  if (!GEMINI_API_KEY) return null;
  const thinkingLevel = GEMINI_THINKING_LEVEL === "off" ? undefined : GEMINI_THINKING_LEVEL;
  return new GeminiProvider({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, thinkingLevel });
}

export function getPricing(): TokenPricing | null {
  const { GEMINI_INPUT_PRICE_PER_MILLION: input, GEMINI_OUTPUT_PRICE_PER_MILLION: output } = getEnv();
  return input !== undefined && output !== undefined ? { inputPerMillion: input, outputPerMillion: output } : null;
}

export function getGenerationLimits() {
  const env = getEnv();
  return {
    perUserPerDay: env.GENERATION_PER_USER_PER_DAY,
    perCompanyPerDay: env.GENERATION_PER_COMPANY_PER_DAY,
    maxConcurrentPerCompany: env.GENERATION_MAX_CONCURRENT_PER_COMPANY,
  };
}
