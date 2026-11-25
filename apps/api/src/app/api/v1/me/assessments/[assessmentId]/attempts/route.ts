import { getCandidateAttempt, startAttempt } from "@skillprove/database";
import { candidateAttemptSchema } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import { requireDb, type RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";

/**
 * Starts an attempt (201), or returns the one already in progress (200), so a repeated tap
 * never uses up another attempt. Needs a candidate profile (409 PROFILE_REQUIRED). The
 * deadline is set here, on the server. There is no request body.
 */
export const POST = withAuth(async (_request, user, context: RouteContext<{ assessmentId: string }>) => {
  const { assessmentId } = await context.params;
  if (!z.uuid().safeParse(assessmentId).success) throw notFound();
  const db = requireDb();
  const { attemptId, created } = await startAttempt(db, user.id, assessmentId);
  const attempt = await getCandidateAttempt(db, user.id, attemptId);
  if (!attempt) throw notFound();
  return ok(candidateAttemptSchema.parse(attempt), created ? 201 : 200);
});
