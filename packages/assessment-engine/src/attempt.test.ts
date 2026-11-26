import type { AttemptQuestion } from "@skillprove/validation";
import { describe, expect, it } from "vitest";
import { answersToSubmit, formatCountdown, fromStored, isAnswered, secondsLeft, toggleChoice, toStored, unansweredCount } from "./attempt";

const choices = [
  { id: "A", text: "One" },
  { id: "B", text: "Two" },
  { id: "C", text: "Three" },
];
const mc: AttemptQuestion = { id: "11111111-1111-4111-8111-111111111111", position: 1, kind: "multiple_choice", prompt: "Pick", choices };
const tf: AttemptQuestion = { id: "22222222-2222-4222-8222-222222222222", position: 2, kind: "true_false", prompt: "True?" };
const ms: AttemptQuestion = { id: "33333333-3333-4333-8333-333333333333", position: 3, kind: "multiple_select", prompt: "Pick some", choices };
const questions = [mc, tf, ms];

describe("answers", () => {
  it("treats false as an answer, and an empty selection as none", () => {
    expect(isAnswered(false)).toBe(true);
    expect(isAnswered([])).toBe(false);
    expect(isAnswered(undefined)).toBe(false);
    expect(unansweredCount(questions, { [tf.id]: false, [ms.id]: [] })).toBe(2);
  });

  it("toggles multiple-select choices in the order they are shown", () => {
    expect(toggleChoice(ms, undefined, "C")).toEqual(["C"]);
    expect(toggleChoice(ms, ["C"], "A")).toEqual(["A", "C"]);
    expect(toggleChoice(ms, ["A", "C"], "C")).toEqual(["A"]);
  });

  it("sends only answered questions", () => {
    expect(answersToSubmit({ [mc.id]: "B", [ms.id]: [] })).toEqual({ [mc.id]: "B" });
  });
});

describe("saving answers on the phone", () => {
  it("round-trips answers by position", () => {
    const answers = { [mc.id]: "B", [tf.id]: false, [ms.id]: ["A", "C"] };
    const stored = toStored(questions, answers);
    expect(stored).toEqual({ "1": "B", "2": false, "3": ["A", "C"] });
    expect(fromStored(questions, JSON.parse(JSON.stringify(stored)))).toEqual(answers);
  });

  it("drops saved values that no longer fit their question", () => {
    expect(fromStored(questions, { "1": "Z", "2": "yes", "3": ["A", "Q"], "9": "A" })).toEqual({});
    expect(fromStored(questions, null)).toEqual({});
    expect(fromStored(questions, ["B"])).toEqual({});
  });
});

describe("countdown", () => {
  const deadline = "2026-11-26T10:10:00.000Z";
  const at = (iso: string) => new Date(iso).getTime();

  it("counts whole seconds to the server deadline and stops at zero", () => {
    expect(secondsLeft(deadline, at("2026-11-26T10:00:00.000Z"))).toBe(600);
    expect(secondsLeft(deadline, at("2026-11-26T10:09:59.400Z"))).toBe(1);
    expect(secondsLeft(deadline, at("2026-11-26T10:11:00.000Z"))).toBe(0);
    expect(secondsLeft(null, 0)).toBeNull();
  });

  it("formats minutes and hours", () => {
    expect(formatCountdown(245)).toBe("4:05");
    expect(formatCountdown(3845)).toBe("1:04:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});
