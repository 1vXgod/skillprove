import type { AiJobStatus, AssessmentStatus } from "./assessment";

/** One tone per assessment status, so web and mobile colour them the same way. */
export const ASSESSMENT_STATUS_TONE = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" } as const satisfies Record<AssessmentStatus, string>;

/** The three steps a generation job goes through, in order. */
export const JOB_STEPS = ["queued", "generating", "ready"] as const;
export type JobStep = (typeof JOB_STEPS)[number];
export type JobStepState = "done" | "active" | "pending" | "failed" | "cancelled";

/**
 * The state of each step for a job status. Only what the job reports is shown: a failed or
 * cancelled job does not say how far it got, so earlier steps stay pending rather than ticked,
 * and the last step carries the outcome.
 */
export function jobStepStates(status: AiJobStatus): Record<JobStep, JobStepState> {
  switch (status) {
    case "QUEUED":
      return { queued: "active", generating: "pending", ready: "pending" };
    case "RUNNING":
      return { queued: "done", generating: "active", ready: "pending" };
    case "SUCCEEDED":
      return { queued: "done", generating: "done", ready: "done" };
    case "FAILED":
      return { queued: "pending", generating: "pending", ready: "failed" };
    case "CANCELLED":
      return { queued: "pending", generating: "pending", ready: "cancelled" };
  }
}

/** True while the job may still change, so screens keep polling. */
export const isJobActive = (status: AiJobStatus) => status === "QUEUED" || status === "RUNNING";
