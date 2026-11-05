import { presentJob, requireJobAccess } from "../../../../../../lib/ai/job-access";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import type { RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Job status for polling. Visible to whoever started the job and to the company's owners and admins. */
export const GET = withAuth(async (_request, user, context: RouteContext<{ jobId: string }>) => {
  const { jobId } = await context.params;
  const { job } = await requireJobAccess(user, jobId, "read");
  return ok(presentJob(job));
});
