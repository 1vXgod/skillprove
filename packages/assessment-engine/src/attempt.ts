import type { AttemptAnswer, AttemptQuestion } from "@skillprove/validation";

/*
 * Pure helpers for taking an attempt, shared by the phone and web apps (Milestone 7, slices 14
 * and 18). Answers stay on the device until submit; the server stores and scores them only then.
 */

/** Answers keyed by question ID, as the API expects them on submit. */
export type Answers = Record<string, AttemptAnswer>;

export function isAnswered(answer: AttemptAnswer | undefined): boolean {
  if (answer === undefined) return false;
  return Array.isArray(answer) ? answer.length > 0 : true;
}

export function unansweredCount(questions: readonly AttemptQuestion[], answers: Answers): number {
  return questions.filter((q) => !isAnswered(answers[q.id])).length;
}

/** Adds or removes a choice for a multiple-select question, keeping the choices' order. */
export function toggleChoice(question: AttemptQuestion, current: AttemptAnswer | undefined, choiceId: string): string[] {
  const selected = new Set(Array.isArray(current) ? current : []);
  if (selected.has(choiceId)) selected.delete(choiceId);
  else selected.add(choiceId);
  const order = "choices" in question ? question.choices.map((c) => c.id) : [];
  return order.filter((id) => selected.has(id));
}

/** Only answered questions are sent; an empty multiple select counts as unanswered. */
export function answersToSubmit(answers: Answers): Answers {
  return Object.fromEntries(Object.entries(answers).filter(([, answer]) => isAnswered(answer)));
}

/*
 * Answers are saved on the device by question position rather than ID, so they stay small: the
 * phone's secure store warns above about 2 KB per value, and an assessment has at most 30
 * questions. Anything that does not fit its question is dropped when read back.
 */
export type StoredAnswers = Record<string, AttemptAnswer>;

export function toStored(questions: readonly AttemptQuestion[], answers: Answers): StoredAnswers {
  const stored: StoredAnswers = {};
  for (const q of questions) {
    const answer = answers[q.id];
    if (isAnswered(answer)) stored[String(q.position)] = answer!;
  }
  return stored;
}

export function fromStored(questions: readonly AttemptQuestion[], stored: unknown): Answers {
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
  const answers: Answers = {};
  for (const q of questions) {
    const value = (stored as Record<string, unknown>)[String(q.position)];
    if (fitsQuestion(q, value)) answers[q.id] = value;
  }
  return answers;
}

function fitsQuestion(question: AttemptQuestion, value: unknown): value is AttemptAnswer {
  switch (question.kind) {
    case "true_false":
      return typeof value === "boolean";
    case "multiple_choice":
      return typeof value === "string" && question.choices.some((c) => c.id === value);
    case "multiple_select":
      return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string" && question.choices.some((c) => c.id === v));
  }
}

/** Whole seconds until the server's deadline, never negative. */
export function secondsLeft(expiresAt: string | null, now: number): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

/** "4:05" under an hour, "1:04:05" from an hour up. */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
