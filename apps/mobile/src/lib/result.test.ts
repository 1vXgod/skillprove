import type { SkillPassport } from "@skillprove/validation";
import { describe, expect, it } from "vitest";
import { RESULT_POLL_MS, resultPollInterval, skillStanding } from "./result";

const skillId = "11111111-1111-4111-8111-111111111111";
const passportWith = (score: number, confidence: number) =>
  ({ verified: [{ skill: { id: skillId, name: "JavaScript" }, score, confidence }] }) as unknown as SkillPassport;

describe("result polling", () => {
  it("polls only while the result is pending", () => {
    expect(resultPollInterval("pending")).toBe(RESULT_POLL_MS);
    expect(resultPollInterval("scored")).toBe(false);
    expect(resultPollInterval("failed")).toBe(false);
    expect(resultPollInterval(undefined)).toBe(false);
  });
});

describe("skillStanding", () => {
  it("names a level only from confidence 50", () => {
    expect(skillStanding(passportWith(85, 50), skillId)).toEqual({ kind: "level", level: "EXPERT" });
    expect(skillStanding(passportWith(45, 60), skillId)).toEqual({ kind: "level", level: "INTERMEDIATE" });
    expect(skillStanding(passportWith(85, 49), skillId)).toEqual({ kind: "moreNeeded" });
  });

  it("says nothing for a skill without a verified score", () => {
    expect(skillStanding(passportWith(85, 90), "22222222-2222-4222-8222-222222222222")).toBeNull();
    expect(skillStanding(undefined, skillId)).toBeNull();
  });
});
