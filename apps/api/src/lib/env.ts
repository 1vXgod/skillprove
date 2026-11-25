import { GENERATION_LIMIT_DEFAULTS } from "@skillprove/shared";
import { z } from "zod";

const originList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .refine((origins) => origins.every(isExactOrigin), {
    message: "Must be comma-separated origins such as https://app.example.com",
  });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional().catch(undefined),
  CORS_ALLOWED_ORIGINS: originList,
  CLERK_SECRET_KEY: z.string().min(1).optional().catch(undefined),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional().catch(undefined),
  CLERK_JWT_KEY: z.string().min(1).optional().catch(undefined),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional().catch(undefined),
  GEMINI_API_KEY: z.string().min(1).optional().catch(undefined),
  // gemini-2.5-flash is closed to new API keys (404 "no longer available to new users", 2026-11-26).
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  /** How much the model reasons before answering. "low" is much faster; "off" sends no setting. */
  GEMINI_THINKING_LEVEL: z.string().min(1).default("low"),
  /** US dollars per million tokens, for cost estimates. Unset means cost is not estimated. */
  GEMINI_INPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().optional().catch(undefined),
  GEMINI_OUTPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().optional().catch(undefined),
  GENERATION_PER_USER_PER_DAY: z.coerce.number().int().min(0).default(GENERATION_LIMIT_DEFAULTS.perUserPerDay).catch(GENERATION_LIMIT_DEFAULTS.perUserPerDay),
  GENERATION_PER_COMPANY_PER_DAY: z.coerce.number().int().min(0).default(GENERATION_LIMIT_DEFAULTS.perCompanyPerDay).catch(GENERATION_LIMIT_DEFAULTS.perCompanyPerDay),
  GENERATION_MAX_CONCURRENT_PER_COMPANY: z.coerce.number().int().min(1).default(GENERATION_LIMIT_DEFAULTS.maxConcurrentPerCompany).catch(GENERATION_LIMIT_DEFAULTS.maxConcurrentPerCompany),
  GENERATION_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(GENERATION_LIMIT_DEFAULTS.providerTimeoutMs).catch(GENERATION_LIMIT_DEFAULTS.providerTimeoutMs),
  GENERATION_MAX_PROVIDER_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(GENERATION_LIMIT_DEFAULTS.maxProviderAttempts).catch(GENERATION_LIMIT_DEFAULTS.maxProviderAttempts),
  GENERATION_MAX_JOB_RETRIES: z.coerce.number().int().min(0).max(5).default(GENERATION_LIMIT_DEFAULTS.maxJobRetries).catch(GENERATION_LIMIT_DEFAULTS.maxJobRetries),
});

function isExactOrigin(value: string): boolean {
  return URL.canParse(value) && new URL(value).origin === value;
}

export function getEnv(source: Record<string, string | undefined> = process.env) {
  return envSchema.parse(source);
}
