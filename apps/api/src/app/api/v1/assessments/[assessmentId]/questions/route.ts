import { encodeQuestion } from "@skillprove/assessment-engine";
import { addQuestion } from "@skillprove/database";
import { ASSESSMENT_LIMITS } from "@skillprove/shared";
import { questionContentSchema } from "@skillprove/validation";
import { requireAssessmentAccess } from "../../../../../../lib/assessments/access";
import { contentLocale } from "../../../../../../lib/request";
import { detailOf } from "../../../../../../lib/assessments/present";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../lib/request";
import { requireSkillInAssessment } from "../../../../../../lib/assessments/skills";

export const dynamic = "force-dynamic";

/** Adds a question to the open draft. Its skill must be one of the assessment's skills. */
export const POST = withAuth(async (request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  const content = await parseBody(request, questionContentSchema);
  await requireSkillInAssessment(db, companyId, assessmentId, content.skillId);
  await addQuestion(db, companyId, assessmentId, encodeQuestion(content) as never, ASSESSMENT_LIMITS.maxQuestions);
  return ok((await detailOf(db, companyId, assessmentId, contentLocale(request, user))), 201);
});
