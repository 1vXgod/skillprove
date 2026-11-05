import type { PrismaClient } from "../generated/prisma/client";

/** Null unless the membership is active and the company has not been deleted. */
export function findActiveCompanyMembership(
  client: PrismaClient,
  userId: string,
  companyId: string,
) {
  return client.companyMember.findFirst({
    where: { userId, companyId, status: "ACTIVE", company: { deletedAt: null } },
  });
}

/** Null if the user has no platform role, or it has been revoked. */
export function findActivePlatformAdmin(client: PrismaClient, userId: string) {
  return client.platformAdmin.findFirst({ where: { userId, revokedAt: null } });
}

export function findUserByAuthSubject(client: PrismaClient, authSubject: string) {
  return client.user.findUnique({ where: { authSubject } });
}

/** The signed-in user's own account summary. */
export function loadUserAccess(client: PrismaClient, userId: string) {
  return client.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      candidateProfile: { select: { id: true } },
      companyMemberships: {
        where: { status: "ACTIVE", company: { deletedAt: null } },
        select: { companyId: true, role: true },
      },
    },
  });
}
