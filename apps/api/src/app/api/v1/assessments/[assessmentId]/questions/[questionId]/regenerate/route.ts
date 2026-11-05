import { createGenerationJob, getAssessment } from "@skillprove/database";
import { idempotencyKeySchema, questionRegenerationSchema } from "@skillprove/validation";
import { z } from "zod";
import { presentJob } from "../../../../../../../../lib/ai/job-access";
import { processGenerationJob } from "../../../../../../../../lib/ai/process-job";
import { getAiProvider, getGenerationLimits } from "../../../../../../../../lib/ai/provider";
import { runInBackground } from "../../../../../../../../lib/ai/schedule";
import { requireAssessmentAccess } from "../../../../../../../../lib/assessments/access";
import { withAuth } from "../../../../../../../../lib/auth/guards";
import { badRequest, notFound, ok, unavailable } from "../../../../../../../../lib/http";
import { parseBody, type RouteContext } from "../../../../../../../../lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Asks the AI for a replacement for one question in the open draft. Returns a job to poll, like full generation, and counts toward the same limits. */
export const POST = withAuth(async (request, user, context: RouteContext<{ assessmentId: string; questionId: string }>) => {
  const { assessmentId, questionId } = await context.params;
  const { db, companyId } = await requireAssessmentAccess(user, assessmentId, "author");
  if (!z.uuid().safeParse(questionId).success) throw notFound();
  const { additionalInstructions } = await parseBody(request, questionRegenerationSchema);

  const record = await getAssessment(db, companyId, assessmentId);
  if (record.working.status !== "DRAFT") throw badRequest({ assessment: "notReady" });
  if (!record.working.questions.some((q) => q.id === questionId)) throw notFound();

  const header = request.headers.get("idempotency-key");
  const parsedKey = header === null ? null : idempotencyKeySchema.safeParse(header);
  if (parsedKey && !parsedKey.success) throw badRequest({ idempotencyKey: "invalidChoice" });

  const provider = getAiProvider();
  if (!provider) throw unavailable();
  const { job, created } = await createGenerationJob(db, {
    companyId,
    userId: user.id,
    idempotencyKey: parsedKey?.success ? `q-${questionId}-${parsedKey.data}` : null,
    provider: provider.name,
    modelName: provider.model,
    payload: { kind: "question", assessmentId, questionId, additionalInstructions },
    limits: getGenerationLimits(),
  });
  if (created) runInBackground(() => processGenerationJob(db, job.id));
  return ok({ job: presentJob(job), reused: !created }, 202);
});
