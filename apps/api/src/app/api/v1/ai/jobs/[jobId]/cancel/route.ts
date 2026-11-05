import { cancelJob, getJob } from "@skillprove/database";
import { presentJob, requireJobAccess } from "../../../../../../../lib/ai/job-access";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import type { RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Cancels a queued or running job. A result that arrives afterwards is discarded; its token usage is still recorded. */
export const POST = withAuth(async (_request, user, context: RouteContext<{ jobId: string }>) => {
  const { jobId } = await context.params;
  const { db } = await requireJobAccess(user, jobId, "act");
  await cancelJob(db, jobId);
  const job = await getJob(db, jobId);
  if (!job) throw notFound();
  return ok(presentJob(job));
});
