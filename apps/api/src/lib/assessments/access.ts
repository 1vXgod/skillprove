import { findActivePlatformAdmin, findAssessmentOwner } from "@skillprove/database";
import { COMPANY_ROLE_SETS, isPlatformAdminRole } from "@skillprove/permissions";
import { z } from "zod";
import { requireCompanyMembership, requireCompanyRole, type AuthenticatedUser } from "../auth/guards";
import { forbidden } from "../http";
import { requireDb } from "../request";

export type AssessmentAccessLevel = "read" | "author" | "delete";

const ROLES = {
  read: COMPANY_ROLE_SETS.readAssessments,
  author: COMPANY_ROLE_SETS.authorAssessments,
  delete: COMPANY_ROLE_SETS.deleteAssessments,
} as const;

/**
 * The gate for every route that names an assessment but no company. The owner comes from the
 * database, never from the request, and the caller must be an active member of that company with
 * a role that allows the level. A missing, deleted, platform-owned or foreign assessment all
 * produce the same 403, so existence is not revealed. Platform administrators can read, never edit.
 */
export async function requireAssessmentAccess(user: AuthenticatedUser, assessmentId: string, level: AssessmentAccessLevel) {
  if (!z.uuid().safeParse(assessmentId).success) throw forbidden();
  const db = requireDb();
  const companyId = await findAssessmentOwner(db, assessmentId);
  if (!companyId) throw forbidden();

  try {
    const access = await requireCompanyRole(user, companyId, ROLES[level]);
    return { companyId, db, ...access };
  } catch (error) {
    if (level === "read") {
      const admin = await findActivePlatformAdmin(db, user.id);
      if (admin && isPlatformAdminRole(admin.role)) return { companyId, db, membership: null, scope: null };
    }
    throw error;
  }
}

/** For routes with a company in the path. */
export async function requireCompanyAccess(user: AuthenticatedUser, companyId: string, level: AssessmentAccessLevel) {
  const db = requireDb();
  try {
    const access = await requireCompanyRole(user, companyId, ROLES[level]);
    return { db, ...access };
  } catch (error) {
    if (level === "read" && z.uuid().safeParse(companyId).success) {
      const admin = await findActivePlatformAdmin(db, user.id);
      if (admin && isPlatformAdminRole(admin.role)) return { db, membership: null, scope: null };
    }
    throw error;
  }
}

export { requireCompanyMembership };
