import type { ApiErrorCode } from "@skillprove/shared";
import type { ApiFailure } from "@skillprove/validation";
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function fail(code: ApiErrorCode, message: string, status: number, fields?: Record<string, string>) {
  const body: ApiFailure = { success: false, error: { code, message, ...(fields ? { fields } : {}) } };
  return NextResponse.json(body, { status });
}

/** An expected failure. Its message is sent to the client, so it must hold no internal detail. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    /** Validation message keys per field, for BAD_REQUEST. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthenticated = () => new ApiError("UNAUTHENTICATED", "Sign in to continue.", 401);
export const forbidden = () =>
  new ApiError("FORBIDDEN", "You do not have permission to do this.", 403);
export const unavailable = () =>
  new ApiError("SERVICE_UNAVAILABLE", "This service is temporarily unavailable.", 503);
export const notFound = () => new ApiError("NOT_FOUND", "Not found.", 404);
export const badRequest = (fields?: Record<string, string>) =>
  new ApiError("BAD_REQUEST", "Some details are missing or invalid.", 400, fields);

/**
 * Expected repository failures, recognised by shape so this module does not import the
 * database package (only route code does).
 */
function fromCandidateDataError(error: unknown): ApiError | null {
  if (!(error instanceof Error) || error.name !== "CandidateDataError" || !("reason" in error)) return null;
  const field = "field" in error && typeof error.field === "string" ? error.field : undefined;
  switch (error.reason) {
    case "not_found":
      return notFound();
    case "stale":
      return new ApiError("CONFLICT", "This was changed elsewhere. Reload and try again.", 409);
    case "duplicate":
      return new ApiError("CONFLICT", "This already exists.", 409, field ? { [field]: "duplicate" } : undefined);
    case "limit":
      return badRequest(field ? { [field]: "tooMany" } : undefined);
    case "invalid_reference":
      return badRequest(field ? { [field]: "invalidChoice" } : undefined);
    default:
      return null;
  }
}

/** Expected failures while taking an assessment, recognised by shape for the same reason. */
function fromAttemptDataError(error: unknown): ApiError | null {
  if (!(error instanceof Error) || error.name !== "AttemptDataError" || !("reason" in error)) return null;
  switch (error.reason) {
    case "not_found":
      return notFound();
    case "profile_required":
      return new ApiError("PROFILE_REQUIRED", "Create your profile before taking an assessment.", 409);
    case "attempts_exhausted":
      return new ApiError("ATTEMPTS_EXHAUSTED", "You have used every attempt for this assessment.", 409);
    case "expired":
      return new ApiError("ATTEMPT_EXPIRED", "Time ran out before this attempt was submitted.", 409);
    case "not_in_progress":
      return new ApiError("CONFLICT", "This attempt is no longer in progress.", 409);
    default:
      return null;
  }
}

/** Expected assessment failures, recognised by shape for the same reason. Messages are fixed text; nothing from the request or a provider is echoed. */
function fromAssessmentDataError(error: unknown): ApiError | null {
  if (!(error instanceof Error) || error.name !== "AssessmentDataError" || !("reason" in error)) return null;
  const field = "field" in error && typeof error.field === "string" ? error.field : undefined;
  switch (error.reason) {
    case "not_found":
      return notFound();
    case "stale":
      return new ApiError("CONFLICT", "This was changed elsewhere. Reload and try again.", 409);
    case "immutable":
      return new ApiError("CONFLICT", "This version is published and cannot be changed. Create a draft to edit it.", 409);
    case "draft_exists":
      return new ApiError("CONFLICT", "A draft is already open for this assessment.", 409);
    case "job_conflict":
      return new ApiError("CONFLICT", "This request key was already used with different details.", 409);
    case "job_state":
      return new ApiError("CONFLICT", "This job cannot be changed in its current state.", 409);
    case "not_ready":
      return new ApiError("BAD_REQUEST", "The assessment is not ready to publish.", 400, Object.fromEntries((field ?? "").split(",").filter(Boolean).map((key) => [key, "notReady"])));
    case "invalid_reference":
      return badRequest(field ? { [field]: "invalidChoice" } : undefined);
    case "limit":
      return badRequest(field ? { [field]: "tooMany" } : undefined);
    case "rate_limited":
      return new ApiError("RATE_LIMITED", "Generation limit reached. Try again later.", 429);
    default:
      return null;
  }
}

const REDACTIONS: [RegExp, string][] = [
  [/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>"],
  [/\bBearer\s+\S+/gi, "Bearer <redacted>"],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, "<jwt>"],
  [/\b(?:sk|pk|whsec|npg)_\w+/gi, "<secret>"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "<email>"],
  [/(["'])(?:(?!\1).){1,200}\1/g, "<value>"],
];
const SAFE_CODE = /^[A-Za-z0-9_]{1,40}$/;

function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && SAFE_CODE.test(code) ? code : undefined;
}

/**
 * What an unexpected error is, for the server log only. Database and auth client messages can
 * hold URLs, tokens, emails or row values, so only the last line is kept (where Prisma states
 * the reason, after any echo of the query's arguments), with those patterns redacted.
 */
export function describeError(error: unknown) {
  if (!(error instanceof Error)) return { name: typeof error };
  const lastLine = error.message.split("\n").map((line) => line.trim()).filter(Boolean).at(-1) ?? "";
  const message = REDACTIONS.reduce((text, [pattern, mask]) => text.replace(pattern, mask), lastLine);
  return {
    name: error.name,
    code: errorCode(error) ?? errorCode(error.cause),
    message: message.slice(0, 200),
  };
}

/** Turns unexpected exceptions into the standard error format without leaking details. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response> | Response,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const expected = error instanceof ApiError ? error : (fromCandidateDataError(error) ?? fromAssessmentDataError(error) ?? fromAttemptDataError(error));
      if (expected) return fail(expected.code, expected.message, expected.status, expected.fields);
      console.error("Unhandled API error", JSON.stringify(describeError(error)));
      return fail("INTERNAL_ERROR", "Something went wrong.", 500);
    }
  };
}
