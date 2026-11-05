import { getAssessment, replaceRubric } from "@skillprove/database";
import { rubricInputSchema } from "@skillprove/validation";
import { requireAssessmentAccess } from "../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../lib/request";
import { detailOf } from "../../../../../../lib/assessments/present";
import { withAuth } from "../../../../../../lib/auth/guards";
import { badRequest, ok } from "../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

type Context = RouteContext<{ assessmentId: string }>;

export const GET = withAuth(async (request, user, context: Context) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "read");
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))).rubric);
});

/** Replaces the draft's rubric. Weights must total exactly 100 and criteria may only name the assessment's skills. */
export const PUT = withAuth(async (request, user, context: Context) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  const { criteria } = await parseBody(request, rubricInputSchema);
  const skillIds = new Set((await getAssessment(db, companyId, assessmentId)).working.skills.map((s) => s.skillId));
  if (criteria.some((c) => c.skillId && !skillIds.has(c.skillId))) throw badRequest({ criteria: "invalidChoice" });
  await replaceRubric(
    db,
    companyId,
    assessmentId,
    criteria.map((c) => ({ ...c, skillId: c.skillId ?? null })),
  );
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))).rubric);
});
