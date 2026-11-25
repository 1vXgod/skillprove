import { getAttemptResult } from "@skillprove/database";
import { attemptResultSchema } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import { contentLocale, requireDb, type RouteContext } from "../../../../../../../lib/request";
import { retryScoring } from "../../../../../../../lib/scoring";

export const dynamic = "force-dynamic";

/**
 * The signed-in candidate's result for a submitted attempt: overall and per-skill percentages,
 * never which answers were right. `state` is `pending` while scoring runs (the app polls),
 * `scored` when ready and `failed` if it cannot be scored automatically. A result still
 * pending a minute after submit starts scoring again, in case the first run was lost, at most
 * once a minute per attempt however often the app polls.
 * Someone else's attempt is a 404; an unsubmitted one is 409 CONFLICT, an expired one 409
 * ATTEMPT_EXPIRED.
 */
export const GET = withAuth(async (request, user, context: RouteContext<{ attemptId: string }>) => {
  const { attemptId } = await context.params;
  if (!z.uuid().safeParse(attemptId).success) throw notFound();
  const db = requireDb();
  const { result, retryScoring: needsRetry } = await getAttemptResult(db, user.id, attemptId, contentLocale(request, user));
  if (needsRetry) retryScoring(db, attemptId);
  return ok(attemptResultSchema.parse(result));
});
