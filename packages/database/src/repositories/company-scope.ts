import type { PrismaClient } from "../generated/prisma/client";

/**
 * The tenant boundary for company-facing reads. Every query is filtered by the company fixed
 * at creation, and looking up another company's record returns null. Company-facing API code
 * must use this rather than querying these tables directly.
 */
export function companyScope(client: PrismaClient, companyId: string) {
  const ownAssessment = { ownerCompanyId: companyId, deletedAt: null };
  const ownAttempt = { assessmentVersion: { assessment: ownAssessment } };

  return {
    companyId,

    listMembers: () => client.companyMember.findMany({ where: { companyId } }),

    listInvitations: () => client.companyInvitation.findMany({ where: { companyId } }),

    listAssessments: () => client.assessment.findMany({ where: ownAssessment }),

    getAssessment: (id: string) => client.assessment.findFirst({ where: { id, ...ownAssessment } }),

    listAttempts: () => client.assessmentAttempt.findMany({ where: ownAttempt }),

    getAttempt: (id: string) =>
      client.assessmentAttempt.findFirst({ where: { id, ...ownAttempt } }),

    getSubmission: (id: string) =>
      client.assessmentSubmission.findFirst({ where: { id, attempt: ownAttempt } }),

    getEvaluation: (id: string) =>
      client.evaluation.findFirst({
        where: { id, attempt: ownAttempt },
        include: { criterionScores: true, evidence: true, reviews: true },
      }),

    listAuditLogs: () => client.auditLog.findMany({ where: { companyId } }),
  };
}

export type CompanyScope = ReturnType<typeof companyScope>;
