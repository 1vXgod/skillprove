import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { AssessmentDataError } from "./assessment-errors";

type Json = Prisma.InputJsonValue;

export interface GenerationLimits {
  perUserPerDay: number;
  perCompanyPerDay: number;
  maxConcurrentPerCompany: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keys are scoped to the user and company, so one user can never collide with, or replay, another's key. */
export function scopedIdempotencyKey(companyId: string, userId: string, key: string) {
  return `assessment-generation:${companyId}:${userId}:${key}`;
}

/** Same JSON content regardless of key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Creates a queued job unless the same idempotency key already made one. Repeating a request with
 * the same key and input returns the same job and creates no second one. The same key with
 * different input is a conflict. Limits count jobs in the last 24 hours, including failed ones,
 * because a failed job may still have spent tokens.
 */
export async function createGenerationJob(
  db: PrismaClient,
  input: {
    companyId: string;
    userId: string;
    idempotencyKey: string | null;
    provider: string;
    modelName: string;
    payload: unknown;
    limits: GenerationLimits;
    now?: Date;
  },
) {
  const key = input.idempotencyKey ? scopedIdempotencyKey(input.companyId, input.userId, input.idempotencyKey) : null;

  if (key) {
    const existing = await db.aIJob.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (canonical(existing.input) !== canonical(input.payload)) throw new AssessmentDataError("job_conflict");
      return { job: existing, created: false };
    }
  }

  const since = new Date((input.now ?? new Date()).getTime() - DAY_MS);
  const [byUser, byCompany, active] = await Promise.all([
    db.aIJob.count({ where: { requestedById: input.userId, type: "ASSESSMENT_GENERATION", createdAt: { gte: since } } }),
    db.aIJob.count({ where: { companyId: input.companyId, type: "ASSESSMENT_GENERATION", createdAt: { gte: since } } }),
    db.aIJob.count({ where: { companyId: input.companyId, status: { in: ["QUEUED", "RUNNING"] } } }),
  ]);
  if (byUser >= input.limits.perUserPerDay) throw new AssessmentDataError("rate_limited", "user");
  if (byCompany >= input.limits.perCompanyPerDay) throw new AssessmentDataError("rate_limited", "company");
  if (active >= input.limits.maxConcurrentPerCompany) throw new AssessmentDataError("rate_limited", "concurrent");

  try {
    const job = await db.aIJob.create({
      data: {
        type: "ASSESSMENT_GENERATION",
        provider: input.provider,
        modelName: input.modelName,
        requestedById: input.userId,
        companyId: input.companyId,
        idempotencyKey: key,
        input: input.payload as Json,
      },
    });
    return { job, created: true };
  } catch (error) {
    // Two identical requests at once: the unique key let one through; return its job.
    if (key && (error as { code?: string }).code === "P2002") {
      const winner = await db.aIJob.findUnique({ where: { idempotencyKey: key } });
      if (winner) return { job: winner, created: false };
    }
    throw error;
  }
}

/** A job that has been RUNNING longer than any legitimate run is failed, so a crashed worker cannot leave it stuck. */
export async function failStaleJobs(db: PrismaClient, olderThanMs: number, now = new Date()) {
  await db.aIJob.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(now.getTime() - olderThanMs) } },
    data: { status: "FAILED", errorCode: "timeout", errorMessage: "The job took too long.", finishedAt: now },
  });
}

export function getJob(db: PrismaClient, jobId: string) {
  return db.aIJob.findUnique({ where: { id: jobId } });
}

/** Only one caller can move QUEUED to RUNNING, so a job is never processed twice at once. */
export async function claimJob(db: PrismaClient, jobId: string, now = new Date()) {
  const { count } = await db.aIJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: now, finishedAt: null },
  });
  return count === 1;
}

export interface JobUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
}

/** Marks a running job failed. A job cancelled meanwhile stays cancelled. */
export async function failJob(db: PrismaClient, jobId: string, error: { code: string; message: string }, usage: JobUsage, now = new Date()) {
  const { count } = await db.aIJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: {
      status: "FAILED",
      errorCode: error.code,
      errorMessage: error.message.slice(0, 200),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
      finishedAt: now,
    },
  });
  return count === 1;
}

/** Records spend for a job whose result was discarded because it was cancelled while running. */
export async function recordUsageOnly(db: PrismaClient, jobId: string, usage: JobUsage) {
  await db.aIJob.updateMany({
    where: { id: jobId },
    data: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, estimatedCost: usage.estimatedCost },
  });
}

/** Succeeds only while the job is still RUNNING; returns false if it was cancelled meanwhile, so the caller discards the result. */
export async function completeJob(
  db: PrismaClient | Prisma.TransactionClient,
  jobId: string,
  usage: JobUsage,
  assessmentId: string | null,
  /** The model that actually answered, when it was a fallback rather than the one the job started with. */
  answeredBy: string | null = null,
  now = new Date(),
) {
  const { count } = await db.aIJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: {
      status: "SUCCEEDED",
      assessmentId,
      ...(answeredBy ? { modelName: answeredBy } : {}),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
      errorCode: null,
      errorMessage: null,
      finishedAt: now,
    },
  });
  return count === 1;
}

export async function cancelJob(db: PrismaClient, jobId: string, now = new Date()) {
  const { count } = await db.aIJob.updateMany({
    where: { id: jobId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", finishedAt: now },
  });
  if (count !== 1) throw new AssessmentDataError("job_state");
}

/** FAILED jobs can be queued again a limited number of times. Each retry counts toward the daily limits only as the same job, so the cap is on retries. */
export async function requeueJob(db: PrismaClient, jobId: string, maxRetries: number) {
  const { count } = await db.aIJob.updateMany({
    where: { id: jobId, status: "FAILED", retryCount: { lt: maxRetries } },
    data: { status: "QUEUED", errorCode: null, errorMessage: null, startedAt: null, finishedAt: null, retryCount: { increment: 1 } },
  });
  if (count === 1) return;
  const job = await db.aIJob.findUnique({ where: { id: jobId }, select: { status: true, retryCount: true } });
  throw new AssessmentDataError(job?.status === "FAILED" && job.retryCount >= maxRetries ? "retries_exhausted" : "job_state");
}
