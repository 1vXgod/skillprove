import type { QuestionContent } from "@skillprove/validation";
import { describe, expect, it } from "vitest";
import { isObjectiveKind, NotObjectiveError, scoreObjectiveAttempt, type ScorableQuestion } from "./scoring";

const SKILL_A = "11111111-1111-4111-8111-111111111111";
const SKILL_B = "22222222-2222-4222-8222-222222222222";
const choices = [
  { id: "A", text: "One" },
  { id: "B", text: "Two" },
  { id: "C", text: "Three" },
];
const base = (skillId: string) => ({ skillId, difficulty: "INTERMEDIATE", estimatedMinutes: 1, explanation: "e" }) as const;

const single = (id: string, skillId = SKILL_A): ScorableQuestion => ({
  id,
  content: { kind: "multiple_choice", prompt: "p", choices, correctChoiceId: "B", ...base(skillId) },
});
const multi = (id: string, skillId = SKILL_A): ScorableQuestion => ({
  id,
  content: { kind: "multiple_select", prompt: "p", choices, correctChoiceIds: ["A", "C"], ...base(skillId) },
});
const trueFalse = (id: string, skillId = SKILL_A): ScorableQuestion => ({
  id,
  content: { kind: "true_false", prompt: "p", correct: false, ...base(skillId) },
});

describe("scoreObjectiveAttempt", () => {
  it("scores correct answers of every objective kind", () => {
    const result = scoreObjectiveAttempt([single("q1"), multi("q2"), trueFalse("q3")], { q1: "B", q2: ["C", "A"], q3: false });
    expect(result).toMatchObject({ questionCount: 3, correctCount: 3, percent: 100 });
    expect(result.questions.every((q) => q.correct && q.answered)).toBe(true);
  });

  it("scores wrong answers as zero", () => {
    const result = scoreObjectiveAttempt([single("q1"), multi("q2"), trueFalse("q3")], { q1: "A", q2: ["A"], q3: true });
    expect(result).toMatchObject({ correctCount: 0, percent: 0 });
  });

  it("treats multiple select as all or nothing", () => {
    const questions = [multi("q1")];
    expect(scoreObjectiveAttempt(questions, { q1: ["A", "C"] }).percent).toBe(100);
    expect(scoreObjectiveAttempt(questions, { q1: ["A"] }).percent).toBe(0);
    expect(scoreObjectiveAttempt(questions, { q1: ["A", "B", "C"] }).percent).toBe(0);
    expect(scoreObjectiveAttempt(questions, { q1: ["A", "A", "C"] }).percent).toBe(0);
  });

  it("counts unanswered questions as wrong but still measured", () => {
    const result = scoreObjectiveAttempt([single("q1"), single("q2")], { q1: "B" });
    expect(result.percent).toBe(50);
    expect(result.skills[0]).toMatchObject({ questionCount: 2, answeredCount: 1, correctCount: 1 });
    expect(result.questions[1]).toMatchObject({ answered: false, correct: false });
  });

  it("treats malformed responses as wrong without throwing", () => {
    const questions = [single("q1"), multi("q2"), trueFalse("q3")];
    const result = scoreObjectiveAttempt(questions, { q1: ["B"], q2: "A,C", q3: "false" });
    expect(result.correctCount).toBe(0);
    expect(scoreObjectiveAttempt(questions, { q1: { id: "B" }, q2: [1, 2], q3: 0 }).correctCount).toBe(0);
  });

  it("ignores answers to questions that are not in the assessment", () => {
    const result = scoreObjectiveAttempt([single("q1")], { q1: "B", other: "B" });
    expect(result).toMatchObject({ questionCount: 1, correctCount: 1 });
  });

  it("does not read inherited properties as answers", () => {
    const responses = Object.create({ q1: "B" }) as Record<string, unknown>;
    expect(scoreObjectiveAttempt([single("q1")], responses).questions[0]).toMatchObject({ answered: false, correct: false });
  });

  it("groups results by skill", () => {
    const result = scoreObjectiveAttempt([single("q1", SKILL_A), single("q2", SKILL_A), trueFalse("q3", SKILL_B)], {
      q1: "B",
      q2: "A",
      q3: false,
    });
    expect(result.percent).toBe(66.67);
    expect(result.skills).toEqual([
      { skillId: SKILL_A, questionCount: 2, answeredCount: 2, correctCount: 1, percent: 50 },
      { skillId: SKILL_B, questionCount: 1, answeredCount: 1, correctCount: 1, percent: 100 },
    ]);
  });

  it("rounds percentages to two decimals", () => {
    const result = scoreObjectiveAttempt([single("q1"), single("q2"), single("q3")], { q1: "B" });
    expect(result.percent).toBe(33.33);
  });

  it("returns zero for an empty assessment instead of dividing by zero", () => {
    expect(scoreObjectiveAttempt([], {})).toMatchObject({ questionCount: 0, percent: 0, skills: [] });
  });

  it("refuses any assessment that contains a non-objective question", () => {
    const short: ScorableQuestion = {
      id: "q2",
      content: { kind: "short_answer", prompt: "p", expectedCriteria: ["c"], ...base(SKILL_A) } as QuestionContent,
    };
    expect(() => scoreObjectiveAttempt([single("q1"), short], { q1: "B", q2: "text" })).toThrow(NotObjectiveError);
  });
});

describe("isObjectiveKind", () => {
  it("accepts only kinds with one checkable answer", () => {
    expect(["multiple_choice", "multiple_select", "true_false"].every(isObjectiveKind)).toBe(true);
    expect(["short_answer", "scenario", "practical_task"].some(isObjectiveKind)).toBe(false);
  });
});
