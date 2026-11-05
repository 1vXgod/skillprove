import { reorderQuestions } from "@skillprove/database";
import { questionReorderSchema } from "@skillprove/validation";
import { requireAssessmentAccess } from "../../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../../lib/request";
import { detailOf } from "../../../../../../../lib/assessments/present";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { ok } from "../../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Sets the question order. The list must contain every question in the draft exactly once. */
export const PUT = withAuth(async (request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  const { questionIds } = await parseBody(request, questionReorderSchema);
  await reorderQuestions(db, companyId, assessmentId, questionIds);
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))));
});
