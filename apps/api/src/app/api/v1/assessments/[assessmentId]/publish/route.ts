import { decodeQuestion, publishIssues, skillWeights } from "@skillprove/assessment-engine";
import { publishDraft } from "@skillprove/database";
import type { QuestionContent } from "@skillprove/validation";
import { requireAssessmentAccess } from "../../../../../../lib/assessments/access";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import type { RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/**
 * Publishes the open draft after a human asked for it. This is the only way content becomes
 * visible to candidates later, and AI output is never published automatically. The checks run
 * again inside the transaction, the rubric and version freeze together, and the audit record is
 * written in the same transaction.
 */
export const POST = withAuth(async (_request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  const result = await publishDraft(db, companyId, assessmentId, user.id, (draft) => {
    const decoded = draft.questions.map((q) => decodeQuestion(q));
    const questions = decoded.filter((q): q is QuestionContent => q !== null);
    const rubric = draft.rubrics[0];
    const issues = publishIssues({
      title: draft.title,
      instructions: draft.instructions,
      durationMinutes: draft.durationMinutes,
      assessmentType: draft.assessmentType,
      skillIds: draft.skills.map((s) => s.skillId),
      questions,
      rubric: rubric ? { criteria: rubric.criteria.map((c) => ({ weight: Number(c.weight), skillId: c.skillId })) } : null,
    });
    if (questions.length !== decoded.length) issues.push("invalidQuestion");
    return {
      issues,
      skillWeights: skillWeights(
        draft.skills.map((s) => s.skillId),
        questions.map((q) => q.skillId),
      ),
    };
  });
  return ok(result);
});
