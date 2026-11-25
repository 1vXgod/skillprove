import type { AttemptQuestion } from "@skillprove/validation";
import { fromStored, toStored, type Answers } from "./attempt";
import { readPreference, removePreference, writePreference } from "./preference-store";

/*
 * Keeps a candidate's answers on the phone while they take an attempt, so closing the app or
 * losing the connection does not lose them. Nothing reaches the server until submit. A failed
 * read or write only loses the saved copy, never the answers on screen.
 */
const keyFor = (attemptId: string) => `attempt-answers.${attemptId}`;

export async function loadAnswers(attemptId: string, questions: readonly AttemptQuestion[]): Promise<Answers> {
  const raw = await readPreference(keyFor(attemptId));
  if (!raw) return {};
  try {
    return fromStored(questions, JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveAnswers(attemptId: string, questions: readonly AttemptQuestion[], answers: Answers): Promise<void> {
  return writePreference(keyFor(attemptId), JSON.stringify(toStored(questions, answers)));
}

export function clearAnswers(attemptId: string): Promise<void> {
  return removePreference(keyFor(attemptId));
}
