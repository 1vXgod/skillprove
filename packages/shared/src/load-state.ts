/**
 * What a screen shows for a query, from TanStack Query's `status` and `fetchStatus` (kept as
 * plain strings so this package needs no dependency). A query the device cannot send because it
 * is offline is "paused": it stays pending forever unless the screen says so, and TanStack
 * resumes it by itself when the connection returns.
 */
export type LoadState = "loading" | "offline" | "error" | "ready";

export function loadState(query: { status: "pending" | "error" | "success"; fetchStatus: "fetching" | "paused" | "idle" }): LoadState {
  if (query.status === "success") return "ready";
  // Checked before "error": "Try again" while offline pauses the retry and keeps the old error.
  if (query.fetchStatus === "paused") return "offline";
  return query.status === "error" ? "error" : "loading";
}
