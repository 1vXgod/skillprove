import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOGO_MARK_DARK_SVG, LOGO_MARK_INVERSE_SVG, LOGO_MARK_SVG } from "@skillprove/shared/brand";
import { describe, expect, it } from "vitest";

// The files in public/brand are the logo's source of truth; mobile draws the copies in @skillprove/shared/brand.
const file = (variant: string) => readFileSync(join(__dirname, "../../public/brand", `skillprove-mark${variant}.svg`), "utf8");

describe("logo mark", () => {
  it("is the same in the shared package as in the files the web serves", () => {
    expect(LOGO_MARK_SVG).toBe(file(""));
    expect(LOGO_MARK_DARK_SVG).toBe(file("-dark"));
    expect(LOGO_MARK_INVERSE_SVG).toBe(file("-inverse"));
  });
});
