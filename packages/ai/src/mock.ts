import type { GenerationRequest } from "@skillprove/validation";
import { AiProviderError, type AiJsonRequest, type AiJsonResponse, type AiProvider } from "./provider";

type Scripted = AiJsonResponse | AiProviderError | ((request: AiJsonRequest) => AiJsonResponse);

/**
 * A deterministic provider for tests. It replays a script in order, then repeats the last entry,
 * and records every request so tests can assert on what would have been sent.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly model = "mock-1";
  readonly requests: AiJsonRequest[] = [];
  private index = 0;

  constructor(private readonly script: readonly Scripted[]) {}

  async generateJson(request: AiJsonRequest): Promise<AiJsonResponse> {
    this.requests.push(request);
    const entry = this.script[Math.min(this.index, this.script.length - 1)];
    this.index += 1;
    if (!entry) throw new AiProviderError("unavailable", false);
    if (entry instanceof AiProviderError) throw entry;
    return typeof entry === "function" ? entry(request) : entry;
  }

  get calls() {
    return this.requests.length;
  }
}

export const MOCK_USAGE = { inputTokens: 1200, outputTokens: 800 } as const;

export function jsonResponse(value: unknown, usage = MOCK_USAGE): AiJsonResponse {
  return { text: JSON.stringify(value), usage: { ...usage } };
}

/** A valid generated assessment for a request: one question per slot, cycling skills and kinds. Weights total 100. */
export function buildValidGeneratedAssessment(request: GenerationRequest) {
  const kindsByType = {
    KNOWLEDGE: ["multiple_choice", "true_false", "multiple_select", "short_answer"],
    PRACTICAL: ["practical_task", "short_answer"],
    SCENARIO_BASED: ["scenario", "scenario", "multiple_choice"],
  } as const;
  const kinds = kindsByType[request.assessmentType];
  const minutes = Math.max(1, Math.round(request.durationMinutes / request.questionCount));
  const base = (i: number) => ({
    skillId: request.skills[i % request.skills.length]!.skillId,
    difficulty: request.difficulty,
    estimatedMinutes: minutes,
  });
  const questions = Array.from({ length: request.questionCount }, (_, i) => {
    const kind = kinds[i % kinds.length]!;
    const label = `Q${i + 1}`;
    switch (kind) {
      case "multiple_choice":
        return { kind, ...base(i), prompt: `${label}: pick the best option.`, choices: [{ id: "A", text: "First" }, { id: "B", text: "Second" }, { id: "C", text: "Third" }], correctChoiceId: "B", explanation: "B is correct because it is the only option that holds in general." };
      case "multiple_select":
        return { kind, ...base(i), prompt: `${label}: select all that apply.`, choices: [{ id: "A", text: "One" }, { id: "B", text: "Two" }, { id: "C", text: "Three" }, { id: "D", text: "Four" }], correctChoiceIds: ["A", "C"], explanation: "A and C satisfy the condition; B and D do not." };
      case "true_false":
        return { kind, ...base(i), prompt: `${label}: this statement is true.`, correct: true, explanation: "The statement is true by definition." };
      case "short_answer":
        return { kind, ...base(i), prompt: `${label}: explain briefly.`, expectedCriteria: ["Names the key concept", "Gives a correct example"] };
      case "scenario":
        return { kind, ...base(i), scenario: `${label}: a team faces a delivery problem.`, task: "Describe how you would approach it.", expectedCriteria: ["Identifies the main risk", "Proposes a realistic next step"] };
      case "practical_task":
        return { kind, ...base(i), description: `${label}: design a small solution.`, requirements: ["Handles the main case"], deliverables: ["A written outline"], evaluationCriteria: ["Meets the requirements", "Clear reasoning"] };
    }
  });
  const n = request.skills.length;
  const each = Math.floor(10_000 / n) / 100;
  const criteria = request.skills.map((s, i) => ({
    key: `criterion_${i + 1}`,
    title: `Criterion ${i + 1}`,
    description: "What a strong answer shows.",
    maxScore: 10,
    weight: i === n - 1 ? Math.round((100 - each * (n - 1)) * 100) / 100 : each,
    scoringGuidance: "0-3 weak, 4-7 adequate, 8-10 strong.",
    skillId: s.skillId,
  }));
  return {
    title: request.title ?? "Generated assessment",
    description: request.description ?? "Checks practical understanding of the selected skills.",
    instructions: "Answer every question. Use your own words.",
    questions,
    rubric: { criteria },
  };
}
