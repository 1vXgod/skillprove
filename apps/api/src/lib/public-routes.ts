import { API_BASE_PATH } from "@skillprove/shared";

/** The only versioned API paths reachable without a session token. Keep this list short. */
const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  `${API_BASE_PATH}/health`,
  `${API_BASE_PATH}/health/ready`,
  // Authenticated by its signature, not by a session.
  `${API_BASE_PATH}/webhooks/clerk`,
]);

export function requiresSession(pathname: string): boolean {
  const isVersioned = pathname === API_BASE_PATH || pathname.startsWith(`${API_BASE_PATH}/`);
  return isVersioned && !PUBLIC_PATHS.has(pathname.replace(/\/+$/, ""));
}
