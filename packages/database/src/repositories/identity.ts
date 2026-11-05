import { Prisma, type PrismaClient } from "../generated/prisma/client";

export interface VerifiedIdentity {
  /** The identity provider's stable user ID. */
  authSubject: string;
  /** The primary email, only if the provider has verified it. */
  verifiedEmail: string | null;
}

const MAX_ATTEMPTS = 3;

/**
 * Prisma's defaults (2s to get a connection, 5s in total) are too short when a Neon compute is
 * waking or the network is slow, and each statement in a transaction is a round trip.
 */
export const IDENTITY_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Creates or updates the local user. Matching is on `authSubject` only: accounts are never
 * merged by email. A verified email already held by another user is not stored, and stays
 * null until resolved. Repeating a call changes nothing and writes no audit record.
 */
export async function syncIdentity(client: PrismaClient, identity: VerifiedIdentity) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await client.$transaction((tx) => syncOnce(tx, identity), IDENTITY_TRANSACTION_OPTIONS);
    } catch (error) {
      // Concurrent deliveries can race on a unique key. The next attempt sees the winner's row.
      if (!isUniqueViolation(error) || attempt === MAX_ATTEMPTS) throw error;
    }
  }
}

async function syncOnce(tx: Prisma.TransactionClient, identity: VerifiedIdentity) {
  const { authSubject } = identity;
  const wantedEmail = identity.verifiedEmail?.trim().toLowerCase() || null;

  const existing = await tx.user.findUnique({ where: { authSubject } });
  const holder = wantedEmail ? await tx.user.findUnique({ where: { email: wantedEmail } }) : null;
  const hasConflict = holder !== null && holder.id !== existing?.id;
  const email = hasConflict ? null : wantedEmail;

  if (existing && existing.email === email) return existing;

  const user = existing
    ? await tx.user.update({ where: { id: existing.id }, data: { email } })
    : await tx.user.create({ data: { authSubject, email } });

  const audit = { actorType: "SYSTEM" as const, targetType: "user", targetId: user.id };
  await tx.auditLog.create({
    data: { ...audit, action: existing ? "identity.email_changed" : "identity.user_created" },
  });
  if (hasConflict) {
    await tx.auditLog.create({ data: { ...audit, action: "identity.email_conflict" } });
  }
  return user;
}

/**
 * Carries out the account deletion policy in docs/database.md. Evaluations and audit records
 * remain with no direct identity attached. Safe to repeat: once anonymized, the user no
 * longer matches `authSubject`, so nothing further happens.
 */
export async function anonymizeIdentity(client: PrismaClient, authSubject: string) {
  return client.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { authSubject } });
    if (!user) return null;
    const now = new Date();
    const userId = user.id;

    await tx.candidateProfile.deleteMany({ where: { userId } });
    await tx.userSkill.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.userDevice.deleteMany({ where: { userId } });

    const ownAttempt = { candidateUserId: userId };
    await tx.assessmentSubmission.updateMany({
      where: { attempt: ownAttempt, contentErasedAt: null },
      data: { responses: Prisma.DbNull, contentErasedAt: now },
    });
    await tx.evaluationEvidence.updateMany({
      where: { evaluation: { attempt: ownAttempt }, contentErasedAt: null },
      data: { excerpt: null, contentErasedAt: now },
    });
    await tx.fileAsset.updateMany({
      where: { ownerUserId: userId, deletedAt: null },
      data: { status: "DELETED", deletedAt: now },
    });

    await tx.companyMember.updateMany({
      where: { userId, status: { not: "REMOVED" } },
      data: { status: "REMOVED", removedAt: now },
    });
    await tx.platformAdmin.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });

    const anonymized = await tx.user.update({
      where: { id: userId },
      data: { status: "ANONYMIZED", anonymizedAt: now, email: null, authSubject: null },
    });
    await tx.auditLog.create({
      data: {
        action: "identity.user_anonymized",
        actorType: "SYSTEM",
        targetType: "user",
        targetId: userId,
      },
    });
    return anonymized;
  }, IDENTITY_TRANSACTION_OPTIONS);
}
