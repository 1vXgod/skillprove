import { listTakeableAssessments } from "@skillprove/database";
import { takeableAssessmentListSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../lib/auth/guards";
import { ok } from "../../../../../lib/http";
import { contentLocale, requireDb } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Assessments the signed-in candidate can take: published, public and fully objective. */
export const GET = withAuth(async (request, user) => {
  const items = await listTakeableAssessments(requireDb(), user.id, contentLocale(request, user));
  return ok(takeableAssessmentListSchema.parse({ items }));
});
