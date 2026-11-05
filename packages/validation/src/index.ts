import { API_ERROR_CODES, API_VERSION } from "@skillprove/shared";
import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  /** For BAD_REQUEST: a validation message key per field, such as { endDate: "endBeforeStart" }. */
  fields: z.record(z.string(), z.string()).optional(),
});

export const apiFailureSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});

export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data });
}

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("skillprove-api"),
  apiVersion: z.literal(API_VERSION),
  timestamp: z.iso.datetime(),
});

export const readinessSchema = z.object({
  status: z.literal("ready"),
  database: z.literal("connected"),
});

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  status: z.string(),
  locale: z.string(),
  hasCandidateProfile: z.boolean(),
  isPlatformAdmin: z.boolean(),
  companies: z.array(z.object({ companyId: z.uuid(), role: z.string() })),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type Health = z.infer<typeof healthSchema>;
export type Readiness = z.infer<typeof readinessSchema>;

export * from "./candidate";
export * from "./assessment";
