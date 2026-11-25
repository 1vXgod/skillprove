import { getCandidateAttempt, submitAttempt } from "@skillprove/database";
import { attemptSubmitSchema, candidateAttemptSchema } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import { parseBody, requireDb, type RouteContext } from "../../../../../../../lib/request";
import { scheduleScoring } from "../../../../../../../lib/scoring";

export const dynamic = "force-dynamic";

/**
 * Submits the candidate's answers, once. A second submit is 409 CONFLICT; after the deadline
 * plus the grace period it is 409 ATTEMPT_EXPIRED. The body holds answers only: any other
 * field, such as a score, is dropped by the schema. Scoring is not part of this request: it
 * runs after the response is sent, from the stored submission only.
 */
export const POST = withAuth(async (request, user, context: RouteContext<{ attemptId: string }>) => {
  const { attemptId } = await context.params;
  if (!z.uuid().safeParse(attemptId).success) throw notFound();
  const { answers } = await parseBody(request, attemptSubmitSchema);
  const db = requireDb();
  await submitAttempt(db, user.id, attemptId, answers);
  scheduleScoring(db, attemptId);
  const attempt = await getCandidateAttempt(db, user.id, attemptId);
  if (!attempt) throw notFound();
  return ok(candidateAttemptSchema.parse(attempt));
});
