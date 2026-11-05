import { findActivePlatformAdmin, loadUserAccess } from "@skillprove/database";
import { isPlatformAdminRole } from "@skillprove/permissions";
import type { CurrentUser } from "@skillprove/validation";
import { withAuth } from "../../../../lib/auth/guards";
import { getDb } from "../../../../lib/db";
import { ok, unavailable } from "../../../../lib/http";

export const dynamic = "force-dynamic";

/** The signed-in user's own account. Roles come from the database, never from the request. */
export const GET = withAuth(async (_request, user) => {
  const db = getDb();
  if (!db) throw unavailable();

  const [access, admin] = await Promise.all([
    loadUserAccess(db, user.id),
    findActivePlatformAdmin(db, user.id),
  ]);
  return ok<CurrentUser>({
    id: user.id,
    email: user.email,
    status: user.status,
    locale: user.locale,
    hasCandidateProfile: access.candidateProfile !== null,
    isPlatformAdmin: admin !== null && isPlatformAdminRole(admin.role),
    companies: access.companyMemberships,
  });
});
