import { getMessages } from "@skillprove/shared/i18n";
import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGES } from "./candidate";

describe("validation messages", () => {
  it("has a translation in both languages for every validation code", () => {
    for (const locale of ["sq", "en"] as const) {
      expect(Object.keys(getMessages(locale).validation).sort()).toEqual([...VALIDATION_MESSAGES].sort());
    }
  });
});
