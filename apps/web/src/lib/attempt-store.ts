import { fromStored, toStored, type Answers } from "@skillprove/assessment-engine";
import type { AttemptQuestion } from "@skillprove/validation";

/*
 * Keeps a candidate's answers in this browser while they take an attempt, so reloading or closing
 * the tab does not lose them. Nothing reaches the server until submit. Storage can be blocked
 * (private windows, full quota); a failed read or write only loses the saved copy, never the
 * answers on screen. Answers are not secret from the candidate, and they hold no answer key.
 */
const keyFor = (attemptId: string) => `sp-attempt-answers.${attemptId}`;

export function loadAnswers(attemptId: string, questions: readonly AttemptQuestion[]): Answers {
  try {
    const raw = window.localStorage.getItem(keyFor(attemptId));
    return raw ? fromStored(questions, JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveAnswers(attemptId: string, questions: readonly AttemptQuestion[], answers: Answers): void {
  try {
    window.localStorage.setItem(keyFor(attemptId), JSON.stringify(toStored(questions, answers)));
  } catch {
    // Only the saved copy is lost.
  }
}

export function clearAnswers(attemptId: string): void {
  try {
    window.localStorage.removeItem(keyFor(attemptId));
  } catch {
    // Nothing to do.
  }
}
