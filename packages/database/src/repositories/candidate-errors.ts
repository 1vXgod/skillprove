/**
 * Expected failures of candidate operations. The API turns them into responses by `reason`:
 * not_found → 404, stale and duplicate → 409, limit → 400.
 */
export type CandidateDataErrorReason = "not_found" | "stale" | "duplicate" | "limit" | "invalid_reference";

export class CandidateDataError extends Error {
  constructor(
    readonly reason: CandidateDataErrorReason,
    /** The field at fault, for duplicate and limit errors. */
    readonly field?: string,
  ) {
    super(reason);
    this.name = "CandidateDataError";
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
