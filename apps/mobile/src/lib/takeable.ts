import type { TakeableAssessment } from "@skillprove/validation";

/** What the candidate can do with an assessment in the list. */
export type TakeableState = "inProgress" | "available" | "noAttemptsLeft";

export function takeableState(item: Pick<TakeableAssessment, "openAttemptId" | "attemptsUsed" | "maxAttempts">): TakeableState {
  if (item.openAttemptId) return "inProgress";
  return item.attemptsUsed >= item.maxAttempts ? "noAttemptsLeft" : "available";
}
