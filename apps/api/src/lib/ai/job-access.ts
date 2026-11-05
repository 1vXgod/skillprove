import { getJob, failStaleJobs } from "@skillprove/database";
import { COMPANY_ROLE_SETS, hasCompanyRole } from "@skillprove/permissions";
import type { AiJob } from "@skillprove/validation";
import { z } from "zod";
import { requireCompanyMembership, type AuthenticatedUser } from "../auth/guards";
import { forbidden } from "../http";
import { requireDb } from "../request";
import { staleJobAfterMs } from "./process-job";

/**
 * A job belongs to whoever requested it and to the owners and admins of its company. Everyone else,
 * including other members of the same company, gets the same 403 as for a job that does not exist.
 * Acting on a job (retry, cancel) additionally needs an authoring role today, so a removed or
 * demoted requester cannot keep spending the company's budget.
 */
export async function requireJobAccess(user: AuthenticatedUser, jobId: string, mode: "read" | "act") {
  if (!z.uuid().safeParse(jobId).success) throw forbidden();
  const db = requireDb();
  await failStaleJobs(db, staleJobAfterMs());
  const job = await getJob(db, jobId);
  if (!job?.companyId || job.type !== "ASSESSMENT_GENERATION") throw forbidden();

  const { membership } = await requireCompanyMembership(user, job.companyId);
  const isRequester = job.requestedById === user.id;
  const isCompanyAdmin = hasCompanyRole(membership.role, COMPANY_ROLE_SETS.manageCompany);
  if (!isRequester && !isCompanyAdmin) throw forbidden();
  if (mode === "act" && !hasCompanyRole(membership.role, COMPANY_ROLE_SETS.authorAssessments)) throw forbidden();
  return { db, job, companyId: job.companyId };
}

type JobRow = NonNullable<Awaited<ReturnType<typeof getJob>>>;

/** Only stable fields. Prompts, inputs, provider messages and the idempotency key are never included. */
export function presentJob(job: JobRow): AiJob {
  return {
    id: job.id,
    status: job.status,
    assessmentId: job.assessmentId,
    retryCount: job.retryCount,
    errorCode: job.errorCode,
    inputTokens: job.inputTokens,
    outputTokens: job.outputTokens,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}
