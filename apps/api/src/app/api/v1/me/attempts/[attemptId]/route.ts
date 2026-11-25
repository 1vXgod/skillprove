import { getCandidateAttempt } from "@skillprove/database";
import { candidateAttemptSchema } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../lib/http";
import { requireDb, type RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/**
 * The signed-in candidate's own attempt. Someone else's attempt is a 404, exactly like a
 * missing one. Questions are included only while it is in progress, without answer keys.
 */
export const GET = withAuth(async (_request, user, context: RouteContext<{ attemptId: string }>) => {
  const { attemptId } = await context.params;
  if (!z.uuid().safeParse(attemptId).success) throw notFound();
  const attempt = await getCandidateAttempt(requireDb(), user.id, attemptId);
  if (!attempt) throw notFound();
  return ok(candidateAttemptSchema.parse(attempt));
});
