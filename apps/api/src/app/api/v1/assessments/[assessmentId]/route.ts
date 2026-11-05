import { softDeleteAssessment, updateDraftMeta } from "@skillprove/database";
import { assessmentUpdateSchema } from "@skillprove/validation";
import { requireAssessmentAccess } from "../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../lib/request";
import { detailOf } from "../../../../../lib/assessments/present";
import { withAuth } from "../../../../../lib/auth/guards";
import { ok } from "../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

type Context = RouteContext<{ assessmentId: string }>;

/** The assessment as its authors see it, including answer keys. Candidates never use this route. */
export const GET = withAuth(async (request, user, context: Context) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "read");
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))));
});

/** Edits the open draft's details. A published version cannot be edited: create a draft first (409 otherwise). */
export const PUT = withAuth(async (request, user, context: Context) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  const { expectedUpdatedAt, ...patch } = await parseBody(request, assessmentUpdateSchema);
  await updateDraftMeta(db, companyId, assessmentId, patch, new Date(expectedUpdatedAt));
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))));
});

/** Soft-deletes the assessment. Published history is kept in the database. */
export const DELETE = withAuth(async (request, user, context: Context) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "delete");
  await softDeleteAssessment(db, companyId, assessmentId, user.id);
  return ok({ deleted: true });
});
