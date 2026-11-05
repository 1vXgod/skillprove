import {
  companyScope,
  findActiveCompanyMembership,
  findActivePlatformAdmin,
  findUserByAuthSubject,
  type PrismaClient,
} from "@skillprove/database";
import { hasCompanyRole, isPlatformAdminRole, type CompanyRole } from "@skillprove/permissions";
import { z } from "zod";
import { getDb } from "../db";
import { getEnv } from "../env";
import { forbidden, unauthenticated, unavailable, withErrorHandling } from "../http";
import { getClerk } from "./clerk";
import { syncFromClerk } from "./identity-sync";

export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof findUserByAuthSubject>>>;

function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) throw unavailable();
  return db;
}

/**
 * Verifies the bearer token with Clerk's SDK and returns the Clerk user ID. Only the
 * Authorization header is forwarded: cookies are dropped, so a browser cannot be tricked into
 * authenticating a cross-site request, and no other client-supplied header has any effect.
 */
async function verifySessionToken(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw unauthenticated();

  const state = await getClerk().authenticateRequest(
    new Request(request.url, { headers: { authorization } }),
  );
  if (!state.isAuthenticated) throw unauthenticated();

  const { userId, sessionClaims } = state.toAuth();
  if (!userId || !isAuthorizedParty(sessionClaims.azp)) throw unauthenticated();
  return userId;
}

/**
 * Clerk's `authorizedParties` option rejects tokens with no `azp`, which native apps may
 * produce because they send no Origin. So it is applied here instead: a token minted by a
 * website must come from an allowed origin, and a token with no web origin is allowed.
 */
export function isAuthorizedParty(azp: unknown): boolean {
  if (typeof azp !== "string" || !/^https?:\/\//i.test(azp)) return true;
  return getEnv().CORS_ALLOWED_ORIGINS.includes(azp);
}

/** The base of every private route. Creates the local user if the webhook has not yet. */
export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const clerkUserId = await verifySessionToken(request);
  const db = requireDb();

  const user =
    (await findUserByAuthSubject(db, clerkUserId)) ??
    (await syncFromClerk(db, getClerk(), clerkUserId));
  if (!user) throw unauthenticated();
  if (user.status !== "ACTIVE") throw forbidden();
  return user;
}

export async function requirePlatformAdmin(user: AuthenticatedUser) {
  const admin = await findActivePlatformAdmin(requireDb(), user.id);
  if (!admin || !isPlatformAdminRole(admin.role)) throw forbidden();
  return admin;
}

/**
 * Checks the authenticated user's active membership, and only then returns the company's data
 * scope. A company ID from a request is untrusted until this passes. An invalid ID, an unknown
 * company and another company's ID all produce the same 403, so existence is not revealed.
 */
export async function requireCompanyMembership(user: AuthenticatedUser, companyId: string) {
  if (!z.uuid().safeParse(companyId).success) throw forbidden();
  const db = requireDb();
  const membership = await findActiveCompanyMembership(db, user.id, companyId);
  if (!membership) throw forbidden();
  return { membership, scope: companyScope(db, companyId) };
}

export async function requireCompanyRole(
  user: AuthenticatedUser,
  companyId: string,
  allowed: readonly CompanyRole[],
) {
  const access = await requireCompanyMembership(user, companyId);
  if (!hasCompanyRole(access.membership.role, allowed)) throw forbidden();
  return access;
}

/** Candidate data belongs to that candidate. Company access to it needs its own rules later. */
export function requireCandidateAccess(user: AuthenticatedUser, candidateUserId: string) {
  if (user.id !== candidateUserId) throw forbidden();
}

/** Wraps a private route. The user comes from the verified token, never from the request. */
export function withAuth<Context>(
  handler: (request: Request, user: AuthenticatedUser, context: Context) => Promise<Response> | Response,
) {
  return withErrorHandling(async (request: Request, context: Context) => {
    const user = await requireAuthenticatedUser(request);
    return handler(request, user, context);
  });
}
