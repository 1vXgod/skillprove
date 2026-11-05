import { listVersions } from "@skillprove/database";
import { requireAssessmentAccess } from "../../../../../../lib/assessments/access";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import type { RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Version history, newest first. Contains no question content. */
export const GET = withAuth(async (_request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "read");
  const versions = await listVersions(db, companyId, assessmentId);
  return ok({
    items: versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
});
