import { restoreVersion } from "@skillprove/database";
import { z } from "zod";
import { requireAssessmentAccess } from "../../../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../../../lib/request";
import { detailOf } from "../../../../../../../../lib/assessments/present";
import { withAuth } from "../../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../../lib/http";
import type { RouteContext } from "../../../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Copies an earlier version into a new draft. History is never overwritten, and it is refused while a draft is open (409). */
export const POST = withAuth(async (request, user, context: RouteContext<{ assessmentId: string; versionId: string }>) => {
  const { assessmentId, versionId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  if (!z.uuid().safeParse(versionId).success) throw notFound();
  await restoreVersion(db, companyId, assessmentId, versionId, user.id);
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))), 201);
});
