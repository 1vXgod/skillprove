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
});

function isExactOrigin(value: string): boolean {
  return URL.canParse(value) && new URL(value).origin === value;
}

export function getEnv(source: Record<string, string | undefined> = process.env) {
  return envSchema.parse(source);
}
