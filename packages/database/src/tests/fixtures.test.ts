import { decodeQuestion, encodeQuestion } from "@skillprove/assessment-engine";
import { describe, expect, it } from "vitest";
import { fixtureQuestionContents } from "./support";

/*
 * Runs without a database. If a fixture question stops passing the authoring schema, this fails
 * here, with the reason, instead of as "cannot be read for scoring" deep inside a database test.
 */
describe("test fixtures", () => {
  it("stores every fixture question in a form scoring can read back", () => {
    const contents = fixtureQuestionContents("11111111-1111-4111-8111-111111111111", { withWrittenQuestion: true });
    expect(contents).toHaveLength(4);
    for (const content of contents) {
      expect(decodeQuestion(encodeQuestion(content))).toEqual(content);
    }
  });
});
