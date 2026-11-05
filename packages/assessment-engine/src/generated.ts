import type { AssessmentTypeName } from "@skillprove/shared";
import type { GeneratedAssessment, GenerationRequest, QuestionContent } from "@skillprove/validation";
import { questionText } from "./readiness";
import { findUnsafeText } from "./safety";

const KNOWLEDGE_KINDS: readonly string[] = ["multiple_choice", "multiple_select", "true_false", "short_answer"];

export function kindsFitType(questions: readonly QuestionContent[], type: AssessmentTypeName): boolean {
  const kinds: string[] = questions.map((q) => q.kind);
  switch (type) {
    case "KNOWLEDGE":
      return kinds.every((k) => KNOWLEDGE_KINDS.includes(k));
    case "PRACTICAL":
      return kinds.includes("practical_task") && kinds.every((k) => ["practical_task", "short_answer", "scenario"].includes(k));
    case "SCENARIO_BASED":
      return (
        kinds.filter((k) => k === "scenario").length * 2 >= kinds.length &&
        kinds.every((k) => ["scenario", "short_answer", "multiple_choice", "multiple_select", "true_false"].includes(k))
      );
  }
}

/** Checks generated content against the request it answers. Returns problem codes; empty means accepted. */
export function checkGeneratedAgainstRequest(generated: GeneratedAssessment, request: GenerationRequest): string[] {
  const problems: string[] = [];
  const allowed = new Set(request.skills.map((s) => s.skillId));

  if (generated.questions.length !== request.questionCount) problems.push("questionCountMismatch");
  if (generated.questions.some((q) => !allowed.has(q.skillId))) problems.push("unknownSkill");
  if (generated.rubric.criteria.some((c) => c.skillId && !allowed.has(c.skillId))) problems.push("unknownRubricSkill");
  if (
    request.skills.length <= generated.questions.length &&
    request.skills.some((s) => !generated.questions.some((q) => q.skillId === s.skillId))
  )
    problems.push("skillNotCovered");
  if (!kindsFitType(generated.questions, request.assessmentType)) problems.push("kindsDoNotFitType");

  const everything = [
    generated.title,
    generated.description,
    generated.instructions,
    ...generated.questions.map(questionText),
    ...generated.rubric.criteria.flatMap((c) => [c.title, c.description, c.scoringGuidance]),
  ].join("\n");
  if (findUnsafeText(everything)) problems.push("unsafeContent");
  return problems;
}

/** Sum of per-question estimates, for comparing with the requested duration. */
export function totalEstimatedMinutes(questions: readonly QuestionContent[]): number {
  return questions.reduce((sum, q) => sum + q.estimatedMinutes, 0);
}
