import { questionContentSchema, rubricInputSchema, weightsTotal100, type QuestionContent } from "@skillprove/validation";
import { describe, expect, it } from "vitest";
import { decodeQuestion, encodeQuestion, toCandidateQuestion } from "./codec";
import { publishIssues } from "./readiness";
import { findUnsafeText } from "./safety";
import { distributeWeights, skillWeights } from "./weights";

const SKILL = "11111111-1111-4111-8111-111111111111";
const base = { skillId: SKILL, difficulty: "INTERMEDIATE", estimatedMinutes: 3 } as const;
const choices = [
  { id: "A", text: "One" },
  { id: "B", text: "Two" },
  { id: "C", text: "Three" },
];

const samples: QuestionContent[] = [
  { kind: "multiple_choice", prompt: "p", choices, correctChoiceId: "B", explanation: "e", ...base },
  { kind: "multiple_select", prompt: "p", choices, correctChoiceIds: ["A", "C"], explanation: "e", ...base },
  { kind: "true_false", prompt: "p", correct: false, explanation: "e", ...base },
  { kind: "short_answer", prompt: "p", expectedCriteria: ["c"], ...base },
  { kind: "scenario", scenario: "s", task: "t", expectedCriteria: ["c"], ...base },
  { kind: "practical_task", description: "d", requirements: ["r"], deliverables: ["x"], evaluationCriteria: ["c"], ...base },
];

describe("question codec", () => {
  it.each(samples)("round-trips $kind through the stored shape", (question) => {
    const stored = encodeQuestion(question);
    expect(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "SHORT_TEXT", "LONG_TEXT"]).toContain(stored.type);
    expect(decodeQuestion(stored)).toEqual(question);
  });

  it("keeps answers out of the candidate view", () => {
    for (const q of samples) {
      const text = JSON.stringify(toCandidateQuestion(q));
      for (const secret of ["correctChoiceId", "correctChoiceIds", "explanation", "expectedCriteria", "evaluationCriteria", "correct\""]) {
        expect(text).not.toContain(secret);
      }
    }
  });

  it("returns null for corrupt stored data instead of throwing", () => {
    const stored = encodeQuestion(samples[0]!);
    expect(decodeQuestion({ ...stored, answerKey: { kind: "multiple_choice", correctChoiceId: "Z" } })).toBeNull();
    expect(decodeQuestion({ ...stored, options: null, answerKey: null })).toBeNull();
  });
});

describe("question validation", () => {
  it("requires the fields of each kind", () => {
    expect(questionContentSchema.safeParse({ kind: "multiple_choice", prompt: "p", choices, correctChoiceId: "Z", explanation: "e", ...base }).success).toBe(false);
    expect(questionContentSchema.safeParse({ kind: "multiple_select", prompt: "p", choices, correctChoiceIds: ["A", "B", "C"], explanation: "e", ...base }).success).toBe(false);
    expect(questionContentSchema.safeParse({ kind: "true_false", prompt: "p", explanation: "e", ...base }).success).toBe(false);
    expect(questionContentSchema.safeParse({ kind: "short_answer", prompt: "p", expectedCriteria: [], ...base }).success).toBe(false);
    expect(questionContentSchema.safeParse({ kind: "practical_task", description: "d", requirements: ["r"], ...base }).success).toBe(false);
    expect(questionContentSchema.safeParse({ kind: "code", prompt: "run this", ...base }).success).toBe(false);
  });

  it("rejects duplicate choice ids and drops unknown fields", () => {
    expect(questionContentSchema.safeParse({ ...samples[0], choices: [choices[0], choices[0]] }).success).toBe(false);
    const parsed = questionContentSchema.parse({ ...samples[3], score: 100, verifiedScore: 99 });
    expect(parsed).not.toHaveProperty("score");
    expect(parsed).not.toHaveProperty("verifiedScore");
  });
});

describe("rubric weights", () => {
  const criterion = (key: string, weight: number) => ({ key, title: key, description: "d", maxScore: 10, weight, scoringGuidance: "g", skillId: null });
  it("accepts totals of exactly 100, including thirds, and rejects drift", () => {
    expect(weightsTotal100([{ weight: 33.33 }, { weight: 33.33 }, { weight: 33.34 }])).toBe(true);
    expect(weightsTotal100([{ weight: 0.1 }, { weight: 0.2 }, { weight: 99.7 }])).toBe(true);
    expect(weightsTotal100([{ weight: 50 }, { weight: 49.99 }])).toBe(false);
    expect(rubricInputSchema.safeParse({ criteria: [criterion("a", 60), criterion("b", 40)] }).success).toBe(true);
    expect(rubricInputSchema.safeParse({ criteria: [criterion("a", 60), criterion("a", 40)] }).success).toBe(false);
    expect(rubricInputSchema.safeParse({ criteria: [criterion("a", 100), criterion("b", 0)] }).success).toBe(false);
  });
});

describe("weights", () => {
  it("always totals exactly 100", () => {
    for (const counts of [[1, 1, 1], [3, 1], [0, 0], [7, 5, 2, 1], [1]]) {
      expect(distributeWeights(counts).reduce((a, b) => a + b * 100, 0)).toBe(10_000);
    }
  });
  it("gives skills without questions no weight", () => {
    expect(skillWeights(["a", "b"], ["a", "a", null])).toEqual([{ skillId: "a", weight: 100 }, { skillId: "b", weight: 0 }]);
  });
});

describe("publish readiness", () => {
  const ready = {
    title: "T",
    instructions: "I",
    durationMinutes: 30,
    assessmentType: "KNOWLEDGE" as const,
    skillIds: [SKILL],
    questions: [samples[0]!],
    rubric: { criteria: [{ weight: 100, skillId: SKILL }] },
  };
  it("passes a complete draft", () => expect(publishIssues(ready)).toEqual([]));
  it("reports each problem", () => {
    expect(publishIssues({ ...ready, questions: [], rubric: null })).toEqual(expect.arrayContaining(["questionsRequired", "rubricRequired", "skillWithoutQuestion"]));
    expect(publishIssues({ ...ready, rubric: { criteria: [{ weight: 90, skillId: null }] } })).toContain("weightsMustTotal100");
    expect(publishIssues({ ...ready, skillIds: ["other"] })).toContain("questionSkillNotSelected");
    expect(publishIssues({ ...ready, questions: [{ ...samples[3]!, prompt: "State your age and date of birth." } as QuestionContent] })).toContain("unsafeContent");
  });
});

describe("content safety", () => {
  it("flags requests for sensitive details and certification claims, in both languages", () => {
    for (const bad of ["Please enter your religion.", "Enter your date of birth", "Candidates should be officially certified by the board", "Shkruani datën e lindjes", "Prefer young candidates"]) {
      expect(findUnsafeText(bad), bad).not.toBeNull();
    }
    for (const fine of ["Explain how an index speeds up a query.", "Shpjego si funksionon një indeks.", "A birth date column should use the DATE type."]) {
      expect(findUnsafeText(fine), fine).toBeNull();
    }
  });
});
