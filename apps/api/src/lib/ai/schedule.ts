import { after } from "next/server";
import { describeError } from "../http";

/**
 * Runs work after the response is sent: AI generation, so the client gets a job ID at once and
 * polls, and automatic scoring after a submit. This is not a durable queue: if the process stops
 * mid-job, a generation job is failed as stale the next time it is read, and a lost scoring run
 * is meant to be retried by the result endpoint (Milestone 7 slice 10, not built yet). A real
 * worker is a later infrastructure decision.
 */
export function runInBackground(task: () => Promise<void>) {
  const safe = async () => {
    try {
      await task();
    } catch (error) {
      console.error("Background job failed", JSON.stringify(describeError(error)));
    }
  };
  try {
    after(safe);
  } catch {
    // Outside a request scope (for example in a script), run it directly.
    void safe();
  }
}
