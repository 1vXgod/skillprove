/** What a candidate can do with an assessment in the list of assessments to take. */
export type TakeableState = "inProgress" | "available" | "noAttemptsLeft";

/**
 * An open attempt comes first, even when it is the last one allowed; otherwise the assessment is
 * available while attempts remain. Display only: the API decides whether an attempt can start.
 */
export function takeableState(item: { openAttemptId: string | null; attemptsUsed: number; maxAttempts: number }): TakeableState {
  if (item.openAttemptId) return "inProgress";
  return item.attemptsUsed >= item.maxAttempts ? "noAttemptsLeft" : "available";
}
