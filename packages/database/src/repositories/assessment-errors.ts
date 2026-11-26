export type AssessmentDataErrorReason =
  | "not_found"
  | "stale"
  /** The target is a published or archived version. Create a draft first. */
  | "immutable"
  | "draft_exists"
  | "invalid_reference"
  | "limit"
  | "not_ready"
  | "job_conflict"
  | "job_state"
  /** A failed job has used every allowed retry. */
  | "retries_exhausted"
  | "rate_limited";

/** An expected failure from assessment code. The API maps it to a safe response by `reason`. */
export class AssessmentDataError extends Error {
  constructor(
    readonly reason: AssessmentDataErrorReason,
    /** A field name, or for `not_ready` the comma-separated issue keys. Never user content. */
    readonly field?: string,
  ) {
    super(`Assessment data error: ${reason}`);
    this.name = "AssessmentDataError";
  }
}
