export const API_VERSION = "v1";
export const API_BASE_PATH = `/api/${API_VERSION}`;

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "SERVICE_UNAVAILABLE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  /** Taking an assessment needs a candidate profile. Clients ask the user to create one. */
  "PROFILE_REQUIRED",
  /** Every allowed attempt at an assessment has been used. */
  "ATTEMPTS_EXHAUSTED",
  /** The attempt's time ran out before it was submitted. */
  "ATTEMPT_EXPIRED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export * from "./candidate";
export * from "./assessment";
export * from "./verified-score";
