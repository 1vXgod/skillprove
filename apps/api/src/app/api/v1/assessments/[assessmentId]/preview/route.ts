import { getAssessment } from "@skillprove/database";
import { requireAssessmentAccess } from "../../../../../../lib/assessments/access";
import { toPreview } from "../../../../../../lib/assessments/present";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import type { RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** The candidate-facing view for authors to check. It never contains answers, explanations or evaluation criteria. */
export const GET = withAuth(async (_request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "read");
  return ok(toPreview(await getAssessment(db, companyId, assessmentId)));
});
