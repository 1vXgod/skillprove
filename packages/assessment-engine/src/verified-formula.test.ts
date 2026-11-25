import { verifiedSkillLevel } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import { AUTO_FORMULA_VERSION, calculateVerifiedSkillScore, type SkillEvaluationInput } from "./verified-formula";

const input = (overrides: Partial<SkillEvaluationInput>): SkillEvaluationInput => ({
  evaluationId: "e1",
  assessmentId: "a1",
  completedAt: new Date("2026-11-20T10:00:00Z"),
  difficulty: "BEGINNER",
  percent: 50,
  answeredCount: 10,
  ...overrides,
});

describe("calculateVerifiedSkillScore", () => {
  it("returns null when there is no evidence", () => {
    expect(calculateVerifiedSkillScore([])).toBeNull();
  });

  it("uses a single evaluation as it is", () => {
    expect(calculateVerifiedSkillScore([input({ percent: 72.5, answeredCount: 4 })])).toEqual({
      score: 72.5,
      confidence: 20,
      highestDifficulty: "BEGINNER",
      formulaVersion: AUTO_FORMULA_VERSION,
      evidence: [{ evaluationId: "e1", weight: 1 }],
    });
  });

  it("weights harder assessments more", () => {
    const result = calculateVerifiedSkillScore([
      input({ evaluationId: "e1", assessmentId: "a1", difficulty: "BEGINNER", percent: 100 }),
      input({ evaluationId: "e2", assessmentId: "a2", difficulty: "EXPERT", percent: 0 }),
    ]);
    // (100 × 1 + 0 × 1.6) / 2.6 = 38.46
    expect(result?.score).toBe(38.46);
    expect(result?.highestDifficulty).toBe("EXPERT");
    expect(result?.evidence).toEqual([
      { evaluationId: "e1", weight: 1 },
      { evaluationId: "e2", weight: 1.6 },
    ]);
  });

  it("counts only the latest evaluation per assessment, even if an earlier one scored higher", () => {
    const result = calculateVerifiedSkillScore([
      input({ evaluationId: "old", completedAt: new Date("2026-11-01T00:00:00Z"), percent: 90, answeredCount: 10 }),
      input({ evaluationId: "new", completedAt: new Date("2026-11-10T00:00:00Z"), percent: 40, answeredCount: 6 }),
    ]);
    expect(result).toMatchObject({ score: 40, confidence: 30, evidence: [{ evaluationId: "new", weight: 1 }] });
  });

  it("breaks a completion-time tie by evaluation id so the result never depends on input order", () => {
    const a = input({ evaluationId: "e-a", percent: 10 });
    const b = input({ evaluationId: "e-b", percent: 90 });
    expect(calculateVerifiedSkillScore([a, b])?.score).toBe(90);
    expect(calculateVerifiedSkillScore([b, a])?.score).toBe(90);
  });

  it("gives 5 confidence per answered question, capped at 100", () => {
    expect(calculateVerifiedSkillScore([input({ answeredCount: 0 })])?.confidence).toBe(0);
    expect(calculateVerifiedSkillScore([input({ answeredCount: 9 })])?.confidence).toBe(45);
    expect(calculateVerifiedSkillScore([input({ answeredCount: 20 })])?.confidence).toBe(100);
    const many = [input({ assessmentId: "a1", answeredCount: 15 }), input({ evaluationId: "e2", assessmentId: "a2", answeredCount: 15 })];
    expect(calculateVerifiedSkillScore(many)?.confidence).toBe(100);
  });

  it("adds confidence from different assessments but not from replaced attempts", () => {
    const result = calculateVerifiedSkillScore([
      input({ evaluationId: "e1", assessmentId: "a1", answeredCount: 4 }),
      input({ evaluationId: "e2", assessmentId: "a2", answeredCount: 6 }),
      input({ evaluationId: "e0", assessmentId: "a1", answeredCount: 8, completedAt: new Date("2026-01-01T00:00:00Z") }),
    ]);
    expect(result?.confidence).toBe(50);
  });

  it("produces values that fit the database ranges", () => {
    const result = calculateVerifiedSkillScore([
      input({ evaluationId: "e1", assessmentId: "a1", difficulty: "INTERMEDIATE", percent: 33.33 }),
      input({ evaluationId: "e2", assessmentId: "a2", difficulty: "ADVANCED", percent: 66.67 }),
    ]);
    expect(result?.score).toBe(51.28);
    expect(result!.evidence.every((e) => e.weight > 0 && e.weight <= 100)).toBe(true);
  });
});

describe("verifiedSkillLevel", () => {
  it("names no level below 50 confidence", () => {
    expect(verifiedSkillLevel(95, 49)).toBeNull();
    expect(verifiedSkillLevel(95, 0)).toBeNull();
  });

  it("maps scores to levels at the boundaries", () => {
    expect(verifiedSkillLevel(0, 50)).toBe("BEGINNER");
    expect(verifiedSkillLevel(39.99, 50)).toBe("BEGINNER");
    expect(verifiedSkillLevel(40, 50)).toBe("INTERMEDIATE");
    expect(verifiedSkillLevel(59.99, 100)).toBe("INTERMEDIATE");
    expect(verifiedSkillLevel(60, 100)).toBe("ADVANCED");
    expect(verifiedSkillLevel(80, 100)).toBe("EXPERT");
    expect(verifiedSkillLevel(100, 100)).toBe("EXPERT");
  });
});
