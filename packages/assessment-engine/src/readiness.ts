import { ASSESSMENT_LIMITS, type AssessmentTypeName } from "@skillprove/shared";
import { weightsTotal100, type QuestionContent } from "@skillprove/validation";
import { findUnsafeText } from "./safety";

export interface DraftSnapshot {
  title: string;
  instructions: string | null;
  durationMinutes: number | null;
  assessmentType: AssessmentTypeName | null;
  skillIds: readonly string[];
  questions: readonly QuestionContent[];
  rubric: { criteria: readonly { weight: number; skillId: string | null }[] } | null;
}

/** All author-written text of a question, for content checks. */
export function questionText(q: QuestionContent): string {
  switch (q.kind) {
    case "multiple_choice":
    case "multiple_select":
      return [q.prompt, ...q.choices.map((c) => c.text), q.explanation].join("\n");
    case "true_false":
      return `${q.prompt}\n${q.explanation}`;
    case "short_answer":
      return [q.prompt, ...q.expectedCriteria].join("\n");
    case "scenario":
      return [q.scenario, q.task, ...q.expectedCriteria].join("\n");
    case "practical_task":
      return [q.description, ...q.requirements, ...q.deliverables, ...q.evaluationCriteria].join("\n");
  }
}

/** Why a draft cannot be published yet, as message keys. Empty means it can. */
export function publishIssues(draft: DraftSnapshot): string[] {
  const issues = new Set<string>();
  if (!draft.title.trim()) issues.add("titleRequired");
  if (!draft.instructions?.trim()) issues.add("instructionsRequired");
  if (!draft.durationMinutes) issues.add("durationRequired");
  if (!draft.assessmentType) issues.add("typeRequired");
  if (draft.skillIds.length === 0) issues.add("skillsRequired");
  if (draft.questions.length === 0) issues.add("questionsRequired");
  if (draft.questions.length > ASSESSMENT_LIMITS.maxQuestions) issues.add("tooManyQuestions");

  const selected = new Set(draft.skillIds);
  for (const id of draft.skillIds) {
    if (!draft.questions.some((q) => q.skillId === id)) issues.add("skillWithoutQuestion");
  }
  if (draft.questions.some((q) => !selected.has(q.skillId))) issues.add("questionSkillNotSelected");
  if (draft.questions.some((q) => findUnsafeText(questionText(q)))) issues.add("unsafeContent");

  if (!draft.rubric || draft.rubric.criteria.length === 0) issues.add("rubricRequired");
  else {
    if (!weightsTotal100(draft.rubric.criteria)) issues.add("weightsMustTotal100");
    if (draft.rubric.criteria.some((c) => c.skillId && !selected.has(c.skillId))) issues.add("rubricSkillNotSelected");
  }
  return [...issues];
}
