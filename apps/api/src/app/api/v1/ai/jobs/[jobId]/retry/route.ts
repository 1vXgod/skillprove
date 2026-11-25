import { getJob, requeueJob } from "@skillprove/database";
import { presentJob, requireJobAccess } from "../../../../../../../lib/ai/job-access";
import { processGenerationJob } from "../../../../../../../lib/ai/process-job";
import { runInBackground } from "../../../../../../../lib/background";
import { getEnv } from "../../../../../../../lib/env";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import type { RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Queues a failed job again, at most `GENERATION_MAX_JOB_RETRIES` times. Once they are used up the
 * answer is 409 RETRIES_EXHAUSTED; any other state is 409 CONFLICT.
 */
export const POST = withAuth(async (_request, user, context: RouteContext<{ jobId: string }>) => {
  const { jobId } = await context.params;
  const { db } = await requireJobAccess(user, jobId, "act");
  await requeueJob(db, jobId, getEnv().GENERATION_MAX_JOB_RETRIES);
  runInBackground(() => processGenerationJob(db, jobId));
  const job = await getJob(db, jobId);
  if (!job) throw notFound();
  return ok(presentJob(job), 202);
});
