import { describe, expect, it } from "vitest";
import { loadState } from "./load-state";

describe("loadState", () => {
  it("is loading while the first request runs", () => {
    expect(loadState({ status: "pending", fetchStatus: "fetching" })).toBe("loading");
  });

  it("is offline, not loading, when the request is paused for lack of a connection", () => {
    expect(loadState({ status: "pending", fetchStatus: "paused" })).toBe("offline");
  });

  it("is offline when a retry after an error is paused", () => {
    expect(loadState({ status: "error", fetchStatus: "paused" })).toBe("offline");
  });

  it("is an error once the request fails", () => {
    expect(loadState({ status: "error", fetchStatus: "idle" })).toBe("error");
    expect(loadState({ status: "error", fetchStatus: "fetching" })).toBe("error");
  });

  it("is ready with data, even while a background refetch is paused", () => {
    expect(loadState({ status: "success", fetchStatus: "idle" })).toBe("ready");
    expect(loadState({ status: "success", fetchStatus: "paused" })).toBe("ready");
  });
});
