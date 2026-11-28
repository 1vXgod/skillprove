import { describe, expect, it } from "vitest";
import { availableCount, continueAttempt, earnedMedalCount, passportSkillCount, recentActivity, topVerifiedSkills } from "./home";

const skill = (id: string, name: string) => ({ id, name });
const evidence = (evaluationId: string, assessmentTitle: string, completedAt: string | null, superseded = false) => ({ evaluationId, assessmentTitle, completedAt, superseded });

const passport = {
  verified: [
    { skill: skill("s1", "SQL"), score: 64, confidence: 40, evidence: [evidence("e1", "SQL bazë", "2026-11-20T10:00:00.000Z")] },
    // One evaluation can verify two skills: it is one event.
    { skill: skill("s2", "JavaScript"), score: 80, confidence: 75, evidence: [evidence("e2", "JS mesatar", "2026-11-25T10:00:00.000Z"), evidence("e0", "JS bazë", "2026-11-01T10:00:00.000Z", true)] },
    { skill: skill("s3", "TypeScript"), score: 80, confidence: 75, evidence: [evidence("e2", "JS mesatar", "2026-11-25T10:00:00.000Z")] },
  ],
  inAssessment: [
    { attempts: [{ attemptId: "a1", assessmentTitle: "React", stage: "IN_PROGRESS" as const, startedAt: "2026-11-26T09:00:00.000Z", submittedAt: null }] },
    { attempts: [{ attemptId: "a2", assessmentTitle: "Python", stage: "AWAITING_EVALUATION" as const, startedAt: "2026-11-24T08:00:00.000Z", submittedAt: "2026-11-24T08:20:00.000Z" }] },
    // The same attempt listed under a second skill is one event.
    { attempts: [{ attemptId: "a2", assessmentTitle: "Python", stage: "AWAITING_EVALUATION" as const, startedAt: "2026-11-24T08:00:00.000Z", submittedAt: "2026-11-24T08:20:00.000Z" }] },
  ],
};

describe("topVerifiedSkills", () => {
  it("lists the highest scores first, ties by name, with the level or none when confidence is low", () => {
    expect(topVerifiedSkills(passport)).toEqual([
      { skillId: "s2", name: "JavaScript", score: 80, level: expect.any(String), medal: expect.any(String), outdated: false },
      { skillId: "s3", name: "TypeScript", score: 80, level: expect.any(String), medal: expect.any(String), outdated: false },
      { skillId: "s1", name: "SQL", score: 64, level: null, medal: null, outdated: false },
    ]);
    expect(topVerifiedSkills(passport, 1)).toHaveLength(1);
  });
});

describe("recentActivity", () => {
  it("lists real events newest first, once each, without corrected results", () => {
    expect(recentActivity(passport).map((a) => [a.kind, a.title, a.at])).toEqual([
      ["started", "React", "2026-11-26T09:00:00.000Z"],
      ["verified", "JS mesatar", "2026-11-25T10:00:00.000Z"],
      ["submitted", "Python", "2026-11-24T08:20:00.000Z"],
      ["verified", "SQL bazë", "2026-11-20T10:00:00.000Z"],
    ]);
  });

  it("is empty when nothing has happened, and respects the limit", () => {
    expect(recentActivity({ verified: [], inAssessment: [] })).toEqual([]);
    expect(recentActivity(passport, 2)).toHaveLength(2);
  });
});

describe("assessments to take", () => {
  const items = [
    { assessmentId: "x1", title: "JS bazë", attemptsUsed: 1, maxAttempts: 3, openAttemptId: null },
    { assessmentId: "x2", title: "SQL", attemptsUsed: 1, maxAttempts: 2, openAttemptId: "att-9" },
    { assessmentId: "x3", title: "React", attemptsUsed: 2, maxAttempts: 2, openAttemptId: null },
  ];
  it("offers the attempt in progress to continue", () => {
    expect(continueAttempt(items)).toEqual({ attemptId: "att-9", title: "SQL" });
    expect(continueAttempt([items[0]!])).toBeNull();
  });
  it("counts only assessments that can be started now", () => {
    expect(availableCount(items)).toBe(1);
  });
});

describe("profile counts", () => {
  it("counts a skill once when it is both verified and self-reported", () => {
    expect(passportSkillCount({ verified: passport.verified, selfReported: [{ skill: skill("s1", "SQL") }, { skill: skill("s9", "Go") }] })).toBe(4);
    expect(passportSkillCount({ verified: [], selfReported: [] })).toBe(0);
  });

  it("counts medals only where the skill earns one", () => {
    // SQL is below the confidence floor; JavaScript and TypeScript are gold.
    expect(earnedMedalCount(passport.verified)).toBe(2);
    expect(earnedMedalCount([{ score: 39.9, confidence: 100 }, { score: 40, confidence: 50 }])).toBe(1);
    expect(earnedMedalCount([])).toBe(0);
  });
});
