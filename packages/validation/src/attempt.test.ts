import { ASSESSMENT_LIMITS } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import {
  attemptAnswerSchema,
  attemptQuestionSchema,
  attemptResultSchema,
  attemptSubmitSchema,
  candidateAttemptSchema,
} from "./attempt";

const Q1 = "11111111-1111-4111-8111-111111111111";
const Q2 = "22222222-2222-4222-8222-222222222222";

describe("attemptAnswerSchema", () => {
  it("accepts a choice ID, a boolean and a list of distinct choice IDs", () => {
    expect(attemptAnswerSchema.parse("B")).toBe("B");
    expect(attemptAnswerSchema.parse(false)).toBe(false);
    expect(attemptAnswerSchema.parse(["A", "C"])).toEqual(["A", "C"]);
  });

  it("rejects duplicates, malformed IDs, numbers and objects", () => {
    expect(attemptAnswerSchema.safeParse(["A", "A"]).success).toBe(false);
    expect(attemptAnswerSchema.safeParse("A B").success).toBe(false);
    expect(attemptAnswerSchema.safeParse(1).success).toBe(false);
    expect(attemptAnswerSchema.safeParse({ id: "A" }).success).toBe(false);
  });

  it("uses the authoring limits for choice IDs and choice counts", () => {
    const { choiceIdMax, maxChoices } = ASSESSMENT_LIMITS;
    expect(attemptAnswerSchema.safeParse("x".repeat(choiceIdMax)).success).toBe(true);
    expect(attemptAnswerSchema.safeParse("x".repeat(choiceIdMax + 1)).success).toBe(false);
    const choices = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
    expect(attemptAnswerSchema.safeParse(choices(maxChoices)).success).toBe(true);
    expect(attemptAnswerSchema.safeParse(choices(maxChoices + 1)).success).toBe(false);
  });
});

describe("attemptSubmitSchema", () => {
  it("accepts answers keyed by question ID, with unanswered questions left out", () => {
    const parsed = attemptSubmitSchema.parse({ answers: { [Q1]: "B", [Q2]: [] } });
    expect(parsed.answers).toEqual({ [Q1]: "B", [Q2]: [] });
    expect(attemptSubmitSchema.parse({ answers: {} }).answers).toEqual({});
  });

  it("drops anything the client might add, such as a score", () => {
    const parsed = attemptSubmitSchema.parse({ answers: { [Q1]: true }, score: 100, percent: 100, verified: true });
    expect(parsed).toEqual({ answers: { [Q1]: true } });
  });

  it("rejects keys that are not question IDs and more answers than an assessment can have", () => {
    expect(attemptSubmitSchema.safeParse({ answers: { "question-1": "A" } }).success).toBe(false);
    const answers = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, true]));
    expect(attemptSubmitSchema.safeParse({ answers: answers(ASSESSMENT_LIMITS.maxQuestions) }).success).toBe(true);
    expect(attemptSubmitSchema.safeParse({ answers: answers(ASSESSMENT_LIMITS.maxQuestions + 1) }).success).toBe(false);
  });

  it("requires the answers object", () => {
    expect(attemptSubmitSchema.safeParse({}).success).toBe(false);
  });
});

describe("candidate-facing responses", () => {
  const question = { id: Q1, position: 1, kind: "multiple_choice", prompt: "p", choices: [{ id: "A", text: "One" }] };

  it("strips answer keys and explanations from questions", () => {
    const parsed = attemptQuestionSchema.parse({ ...question, correctChoiceId: "A", explanation: "because" });
    expect(parsed).not.toHaveProperty("correctChoiceId");
    expect(parsed).not.toHaveProperty("explanation");
  });

  it("accepts only objective question kinds", () => {
    expect(attemptQuestionSchema.safeParse({ ...question, kind: "short_answer" }).success).toBe(false);
    expect(attemptQuestionSchema.safeParse({ id: Q2, position: 2, kind: "true_false", prompt: "p" }).success).toBe(true);
  });

  it("parses an attempt with a server deadline", () => {
    const attempt = candidateAttemptSchema.parse({
      id: Q2,
      assessmentId: Q1,
      title: "t",
      instructions: null,
      language: "sq",
      difficulty: "INTERMEDIATE",
      status: "IN_PROGRESS",
      attemptNumber: 1,
      maxAttempts: 1,
      startedAt: "2026-11-25T10:00:00.000Z",
      expiresAt: "2026-11-25T10:30:00.000Z",
      submittedAt: null,
      questions: [question],
    });
    expect(attempt.questions).toHaveLength(1);
  });

  it("describes a result by skill and never by question", () => {
    const result = attemptResultSchema.parse({
      attemptId: Q2,
      state: "scored",
      submittedAt: "2026-11-25T10:20:00.000Z",
      scoredAt: "2026-11-25T10:20:01.000Z",
      questionCount: 3,
      percent: 66.67,
      skills: [{ skillId: Q1, name: "React", questionCount: 3, answeredCount: 3, percent: 66.67 }],
      questions: [{ id: Q1, correct: true }],
    });
    expect(result).not.toHaveProperty("questions");
    expect(attemptResultSchema.safeParse({ ...result, state: "pending", percent: 101 }).success).toBe(false);
  });
});
