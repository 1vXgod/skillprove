import { CORS_ALLOWED_REQUEST_HEADERS } from "@skillprove/shared";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = CORS_ALLOWED_REQUEST_HEADERS.join(", ");
const PREFLIGHT_MAX_AGE_SECONDS = "600";

export interface CorsResult {
  headers: Record<string, string>;
  /** Set when the request is a preflight, which is answered without reaching a route. */
  preflightStatus?: 204 | 403;
}

/**
 * Browser-only policy. Native apps send no Origin header, so they get no CORS headers.
 * CORS only limits which sites can read responses in a browser. It is not access control,
 * so disallowed origins still reach the route and rely on authentication like anyone else.
 */
export function evaluateCors(
  request: { origin: string | null; method: string; requestedMethod: string | null },
  allowedOrigins: readonly string[],
): CorsResult {
  const headers: Record<string, string> = { Vary: "Origin" };
  const isAllowed = request.origin !== null && allowedOrigins.includes(request.origin);

  if (isAllowed && request.origin) {
    headers["Access-Control-Allow-Origin"] = request.origin;
  }

  const isPreflight =
    request.method === "OPTIONS" && request.origin !== null && request.requestedMethod !== null;
  if (!isPreflight) return { headers };
  if (!isAllowed) return { headers, preflightStatus: 403 };

  headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS;
  headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS;
  headers["Access-Control-Max-Age"] = PREFLIGHT_MAX_AGE_SECONDS;
  return { headers, preflightStatus: 204 };
}
