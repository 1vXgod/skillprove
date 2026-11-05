import { encodeQuestion } from "@skillprove/assessment-engine";
import { deleteQuestion, updateQuestion } from "@skillprove/database";
import { questionContentSchema } from "@skillprove/validation";
import { z } from "zod";
import { requireAssessmentAccess } from "../../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../../lib/request";
import { detailOf } from "../../../../../../../lib/assessments/present";
import { requireSkillInAssessment } from "../../../../../../../lib/assessments/skills";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";

type Context = RouteContext<{ assessmentId: string; questionId: string }>;

function questionIdOf(value: string) {
  if (!z.uuid().safeParse(value).success) throw notFound();
  return value;
}

/** Replaces a question in the open draft. A question of a published version is not found here: create a draft first. */
export const PUT = withAuth(async (request, user, context: Context) => {
  const params = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, params.assessmentId, "author");
  const content = await parseBody(request, questionContentSchema);
  await requireSkillInAssessment(db, companyId, params.assessmentId, content.skillId);
  await updateQuestion(db, companyId, params.assessmentId, questionIdOf(params.questionId), encodeQuestion(content) as never);
  return ok((await detailOf(db, companyId, params.assessmentId, contentLocale(request, user))));
});

export const DELETE = withAuth(async (request, user, context: Context) => {
  const params = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, params.assessmentId, "author");
  await deleteQuestion(db, companyId, params.assessmentId, questionIdOf(params.questionId));
  return ok((await detailOf(db, companyId, params.assessmentId, contentLocale(request, user))));
});
