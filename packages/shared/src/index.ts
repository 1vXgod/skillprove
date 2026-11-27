export const API_VERSION = "v1";
export const API_BASE_PATH = `/api/${API_VERSION}`;

/**
 * Request headers browsers may send to the API cross-origin. Every header the API client sets
 * must be listed, or the browser blocks the request before it is sent and the client reports a
 * network error. The api-client tests check this.
 */
export const CORS_ALLOWED_REQUEST_HEADERS = ["Authorization", "Content-Type", "Accept", "Idempotency-Key"] as const;

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
  /** A failed generation job has used every retry. Clients suggest starting a new generation. */
  "RETRIES_EXHAUSTED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export * from "./candidate";
export * from "./assessment";
export * from "./verified-score";
export * from "./skill-medal";
export * from "./takeable";
export * from "./load-state";
export * from "./profile-completeness";
export * from "./home";
