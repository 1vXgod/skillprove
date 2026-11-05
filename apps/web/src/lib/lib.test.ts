import { describe, expect, it } from "vitest";
import { cn } from "./cn";
import { isDesignSystemEnabled } from "./design-system";
import { pageItems } from "./ui-helpers";

describe("design system access", () => {
  it("is on in development and test", () => {
    expect(isDesignSystemEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isDesignSystemEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("is off in production unless the server enables it exactly", () => {
    expect(isDesignSystemEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isDesignSystemEnabled({ NODE_ENV: "production", SKILLPROVE_DESIGN_SYSTEM: "true" })).toBe(false);
    expect(isDesignSystemEnabled({ NODE_ENV: "production", SKILLPROVE_DESIGN_SYSTEM: "enabled" })).toBe(true);
  });
});

describe("pageItems", () => {
  it("shows every page when there are few", () => {
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("collapses distant pages into gaps", () => {
    expect(pageItems(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, "gap", 12]);
    expect(pageItems(12, 12)).toEqual([1, "gap", 11, 12]);
  });

  it("handles a single page", () => {
    expect(pageItems(1, 1)).toEqual([1]);
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
