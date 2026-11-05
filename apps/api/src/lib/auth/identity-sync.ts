import type { ClerkClient, User as ClerkUser } from "@clerk/backend";
import { anonymizeIdentity, syncIdentity, type PrismaClient } from "@skillprove/database";

/** Only a verified primary email is trusted. */
export function toVerifiedEmail(user: ClerkUser): string | null {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.verification?.status === "verified" ? primary.emailAddress : null;
}

function isNotFound(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 404;
}

/**
 * Applies Clerk's current state, whatever prompted the call. Reading the current state rather
 * than an event's payload is what makes duplicate and out-of-order events harmless.
 * Returns the local user, or null if the Clerk user no longer exists.
 */
export async function syncFromClerk(db: PrismaClient, clerk: ClerkClient, clerkUserId: string) {
  let user: ClerkUser;
  try {
    user = await clerk.users.getUser(clerkUserId);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await anonymizeIdentity(db, clerkUserId);
    return null;
  }
  return syncIdentity(db, { authSubject: user.id, verifiedEmail: toVerifiedEmail(user) });
}
