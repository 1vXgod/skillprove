import { createHash } from "node:crypto";
import { createGenerationJob, getSkillNames } from "@skillprove/database";
import { generationRequestSchema, idempotencyKeySchema } from "@skillprove/validation";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { requireCompanyAccess } from "../../../../../../../lib/assessments/access";
import { getAiProvider, getGenerationLimits } from "../../../../../../../lib/ai/provider";
import { presentJob } from "../../../../../../../lib/ai/job-access";
import { processGenerationJob } from "../../../../../../../lib/ai/process-job";
import { runInBackground } from "../../../../../../../lib/background";
import { badRequest, ok, unavailable } from "../../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../../lib/request";

export const dynamic = "force-dynamic";
/** The work runs after the response is sent; this is how long the platform lets it continue. */
export const maxDuration = 300;

const AUTO_KEY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Starts an AI generation and returns the job at once (202). Clients poll `GET /ai/jobs/:id`.
 * The optional `Idempotency-Key` header makes a retried request return the same job. Without it,
 * an identical request from the same user within five minutes is treated as an accidental repeat.
 */
export const POST = withAuth(async (request, user, context: RouteContext<{ companyId: string }>) => {
  const { companyId } = await context.params;
  const { db } = await requireCompanyAccess(user, companyId, "author");
  const input = await parseBody(request, generationRequestSchema);

  const header = request.headers.get("idempotency-key");
  let key: string;
  if (header !== null) {
    const parsed = idempotencyKeySchema.safeParse(header);
    if (!parsed.success) throw badRequest({ idempotencyKey: "invalidChoice" });
    key = parsed.data;
  } else {
    const digest = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
    key = `auto-${digest}-${Math.floor(Date.now() / AUTO_KEY_WINDOW_MS)}`;
  }

  const provider = getAiProvider();
  if (!provider) throw unavailable();

  const names = await getSkillNames(db, input.skills.map((s) => s.skillId), input.language);
  if (names.length !== input.skills.length) throw badRequest({ skills: "invalidChoice" });

  const { job, created } = await createGenerationJob(db, {
    companyId,
    userId: user.id,
    idempotencyKey: key,
    provider: provider.name,
    modelName: provider.model,
    payload: { kind: "assessment", request: input },
    limits: getGenerationLimits(),
  });
  if (created) runInBackground(() => processGenerationJob(db, job.id));
  return ok({ job: presentJob(job), reused: !created }, 202);
});
