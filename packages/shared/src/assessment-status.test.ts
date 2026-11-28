import { describe, expect, it } from "vitest";
import { AI_JOB_STATUSES } from "./assessment";
import { isJobActive, jobStepStates } from "./assessment-status";

describe("jobStepStates", () => {
  it("moves through queued, generating and ready", () => {
    expect(jobStepStates("QUEUED")).toEqual({ queued: "active", generating: "pending", ready: "pending" });
    expect(jobStepStates("RUNNING")).toEqual({ queued: "done", generating: "active", ready: "pending" });
    expect(jobStepStates("SUCCEEDED")).toEqual({ queued: "done", generating: "done", ready: "done" });
  });

  it("never ticks steps a failed or cancelled job may not have reached", () => {
    expect(jobStepStates("FAILED")).toEqual({ queued: "pending", generating: "pending", ready: "failed" });
    expect(jobStepStates("CANCELLED")).toEqual({ queued: "pending", generating: "pending", ready: "cancelled" });
  });

  it("has exactly one active step only while the job runs", () => {
    for (const status of AI_JOB_STATUSES) {
      const active = Object.values(jobStepStates(status)).filter((s) => s === "active").length;
      expect(active).toBe(isJobActive(status) ? 1 : 0);
    }
  });
});
