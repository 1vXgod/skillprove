import { scoreAttempt, type PrismaClient } from "@skillprove/database";
import { SCORING_RETRY_AFTER_SECONDS } from "@skillprove/shared";
import { runInBackground } from "./background";

/**
 * Scores a submitted attempt after the response is sent. Temporary errors are logged by
 * `runInBackground` and record nothing, so a later result read can retry. A permanent failure
 * is recorded as a FAILED evaluation, which stops retries; it is logged here so it is noticed.
 */
export function scheduleScoring(db: PrismaClient, attemptId: string) {
  runInBackground(async () => {
    const result = await scoreAttempt(db, attemptId);
    if (result?.status === "FAILED" && result.created) {
      console.error("Attempt cannot be scored automatically", JSON.stringify({ attemptId, evaluationId: result.evaluationId }));
    }
  });
}

const RETRY_INTERVAL_MS = SCORING_RETRY_AFTER_SECONDS * 1000;

/**
 * When each attempt last had scoring retried, so a pending result polled every few seconds
 * retries at most once per interval. This lives in memory, which is enough for a single API
 * process. With several instances each would retry on its own schedule; that would need a
 * throttle stored in the database (for example a "last scheduled" column on the attempt).
 */
const lastScheduled = new Map<string, number>();

/** Schedules scoring again for a result that is still pending, unless it was scheduled within the interval. */
export function retryScoring(db: PrismaClient, attemptId: string) {
  const now = Date.now();
  // Forget old entries so the map cannot grow without bound.
  for (const [id, at] of lastScheduled) if (now - at >= RETRY_INTERVAL_MS) lastScheduled.delete(id);
  if (lastScheduled.has(attemptId)) return;
  // The run started by the submit is not recorded: a retry only happens a minute after it anyway.
  lastScheduled.set(attemptId, now);
  scheduleScoring(db, attemptId);
}
