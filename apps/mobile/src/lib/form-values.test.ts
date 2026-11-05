import { experienceInputSchema, selfReportedSkillInputSchema } from "@skillprove/validation";
import { describe, expect, it } from "vitest";
import { joinList, orNull, splitList, yearsValue } from "./form-values";

describe("form values", () => {
  it("splits comma lists and drops blanks", () => {
    expect(splitList(" TypeScript, , PostgreSQL ,")).toEqual(["TypeScript", "PostgreSQL"]);
    expect(joinList(["A", "B"])).toBe("A, B");
  });

  it("turns blank text into null", () => {
    expect(orNull("  ")).toBeNull();
    expect(orNull(" 2024-01-01 ")).toBe("2024-01-01");
  });

  it("accepts Albanian decimal commas for years", () => {
    expect(yearsValue("2,5")).toBe(2.5);
    expect(yearsValue("")).toBeNull();
    expect(Number.isNaN(yearsValue("two"))).toBe(true);
  });
});

describe("mobile forms use the shared rules", () => {
  it("rejects a typed date in the wrong format, as the API would", () => {
    const result = experienceInputSchema.safeParse({ title: "Dev", companyName: "Co", startDate: "01.02.2024", isCurrent: true });
    expect(result.success).toBe(false);
  });

  it("rejects years that are not half-year steps", () => {
    const result = selfReportedSkillInputSchema.safeParse({ skillId: "6c0b7c5e-1a7a-4c6f-9d6e-3c1b2a4d5e6f", level: "ADVANCED", yearsOfExperience: yearsValue("2,3") });
    expect(result.success).toBe(false);
  });
});
