import { createAssessment, listAssessments } from "@skillprove/database";
import { assessmentListQuerySchema, manualAssessmentInputSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../../lib/auth/guards";
import { requireCompanyAccess } from "../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../lib/request";
import { detailOf } from "../../../../../../lib/assessments/present";
import { ok } from "../../../../../../lib/http";
import { parseBody, parseQuery, type RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

type Context = RouteContext<{ companyId: string }>;

/** Lists the company's assessments, newest first, with pagination. Any active member can read. */
export const GET = withAuth(async (request, user, context: Context) => {
  const { companyId } = await context.params;
  const { db } = await requireCompanyAccess(user, companyId, "read");
  const query = parseQuery(request, assessmentListQuerySchema);
  const result = await listAssessments(db, companyId, query);
  return ok({ ...result, items: result.items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })) });
});

/** Creates an empty draft by hand. It uses the same version, question and rubric model as AI-generated drafts. */
export const POST = withAuth(async (request, user, context: Context) => {
  const { companyId } = await context.params;
  const { db } = await requireCompanyAccess(user, companyId, "author");
  const input = await parseBody(request, manualAssessmentInputSchema);
  const id = await createAssessment(db, {
    companyId,
    userId: user.id,
    source: "HUMAN",
    meta: {
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      language: input.language,
      difficulty: input.difficulty,
      assessmentType: input.assessmentType,
      durationMinutes: input.durationMinutes,
    },
    skillIds: input.skillIds,
  });
  return ok((await detailOf(db, companyId, id, contentLocale(request, user))), 201);
});

