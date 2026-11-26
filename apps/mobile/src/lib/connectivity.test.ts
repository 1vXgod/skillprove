import { describe, expect, it } from "vitest";
import { isOnline } from "./connectivity";

describe("isOnline", () => {
  it("is offline only when the system says so", () => {
    expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
  });

  it("treats unknown as online", () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(isOnline({})).toBe(true);
  });
});
