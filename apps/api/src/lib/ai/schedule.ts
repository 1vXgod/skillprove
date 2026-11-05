import { after } from "next/server";
import { describeError } from "../http";

/**
 * Runs generation after the response is sent, so the client gets a job ID at once and polls.
 * This is not a durable queue: if the process stops mid-job, the job is failed as stale the next
 * time it is read. A real worker is a later infrastructure decision.
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
