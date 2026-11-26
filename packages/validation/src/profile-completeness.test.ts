import { profileCompleteness, type CompletenessProfile } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import type { OwnProfile } from "./candidate";

describe("profile completeness input", () => {
  it("accepts an own profile as returned by the API", () => {
    // Compile-time check: if OwnProfile stops fitting, typecheck fails here.
    const fits = (profile: OwnProfile): CompletenessProfile => profile;
    expect(typeof fits).toBe("function");
    expect(profileCompleteness(null, 0).next).toBe("profile");
  });
});
