import { describe, expect, it } from "vitest";
import { skillMedal } from "./skill-medal";
import { verifiedSkillLevel } from "./verified-score";

describe("skillMedal", () => {
  it.each([
    [100, "gold"],
    [80, "gold"],
    [79.9, "silver"],
    [60, "silver"],
    [59.9, "bronze"],
    [40, "bronze"],
    [39.9, null],
    [0, null],
  ] as const)("score %s gives %s", (score, medal) => {
    expect(skillMedal(score, 75)).toBe(medal);
  });

  it("gives no medal below confidence 50, whatever the score", () => {
    expect(skillMedal(95, 49)).toBeNull();
    expect(skillMedal(95, 50)).toBe("gold");
  });

  it("always matches the verified level", () => {
    const medalFor = { EXPERT: "gold", ADVANCED: "silver", INTERMEDIATE: "bronze", BEGINNER: null } as const;
    for (let score = 0; score <= 100; score += 0.5) {
      for (const confidence of [0, 49, 50, 100]) {
        const level = verifiedSkillLevel(score, confidence);
        expect(skillMedal(score, confidence)).toBe(level ? medalFor[level] : null);
      }
    }
  });
});
