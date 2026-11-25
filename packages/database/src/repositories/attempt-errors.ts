export type AttemptDataErrorReason =
  /** Missing, not takeable by this candidate, or someone else's attempt. All look the same. */
  | "not_found"
  /** Only candidates with a profile can take assessments; the app asks them to create one. */
  | "profile_required"
  /** Every allowed attempt has been used. */
  | "attempts_exhausted"
  /** The attempt's time ran out, including the grace period. */
  | "expired"
  /** The attempt is no longer in progress (already submitted or abandoned). */
  | "not_in_progress"
  /** A result was asked for before the attempt was submitted. */
  | "not_submitted";

/** An expected failure while taking an assessment. The API maps it to a safe response by `reason`. */
export class AttemptDataError extends Error {
  constructor(readonly reason: AttemptDataErrorReason) {
    super(`Attempt data error: ${reason}`);
    this.name = "AttemptDataError";
  }
}
