import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { getEnv } from "../env";
import { unavailable } from "../http";

let cached: ClerkClient | undefined;

/** The server-side Clerk client. Fails closed with a 503 if keys are missing. */
export function getClerk(): ClerkClient {
  if (cached) return cached;
  const { CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_JWT_KEY } = getEnv();
  if (!CLERK_SECRET_KEY || !CLERK_PUBLISHABLE_KEY) throw unavailable();

  cached = createClerkClient({
    secretKey: CLERK_SECRET_KEY,
    publishableKey: CLERK_PUBLISHABLE_KEY,
    jwtKey: CLERK_JWT_KEY,
  });
  return cached;
}

export function resetClerkForTests() {
  cached = undefined;
}
