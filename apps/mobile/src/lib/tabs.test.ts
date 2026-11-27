import { describe, expect, it } from "vitest";
import { tabsFor } from "./tabs";

describe("tabsFor", () => {
  it("shows Home, Assessments, Skill Passport and Profile, in that order", () => {
    expect(tabsFor({ isCompanyMember: false }).filter((t) => t.visible).map((t) => t.name)).toEqual(["index", "take", "skill-passport", "profile"]);
  });

  it("adds the Company tab only for company members", () => {
    expect(tabsFor({ isCompanyMember: false }).find((t) => t.name === "assessments")?.visible).toBe(false);
    expect(tabsFor({ isCompanyMember: true }).filter((t) => t.visible).map((t) => t.name)).toEqual(["index", "take", "skill-passport", "profile", "assessments"]);
  });

  it("keeps every route registered, so links to a hidden tab still resolve", () => {
    expect(tabsFor({ isCompanyMember: false })).toHaveLength(5);
  });
});
