import { describe, expect, it } from "vitest";
import { takeableState } from "./takeable";

describe("takeableState", () => {
  it("shows an open attempt first, even when it is the last one allowed", () => {
    expect(takeableState({ openAttemptId: "a", attemptsUsed: 2, maxAttempts: 2 })).toBe("inProgress");
  });
  it("is available while attempts remain, and closed once all are used", () => {
    expect(takeableState({ openAttemptId: null, attemptsUsed: 1, maxAttempts: 2 })).toBe("available");
    expect(takeableState({ openAttemptId: null, attemptsUsed: 2, maxAttempts: 2 })).toBe("noAttemptsLeft");
  });
});
