import { describe, expect, it } from "vitest";
import { LOGO_MARK_DARK_SVG, LOGO_MARK_INVERSE_SVG, LOGO_MARK_SIZE, LOGO_MARK_SVG } from "./brand";

describe("logo mark", () => {
  it("declares the drawing size it is drawn at", () => {
    for (const svg of [LOGO_MARK_SVG, LOGO_MARK_DARK_SVG, LOGO_MARK_INVERSE_SVG]) expect(svg).toContain(`viewBox="0 0 ${LOGO_MARK_SIZE.width} ${LOGO_MARK_SIZE.height}"`);
  });

  it("is pure vector, with no embedded images or scripts", () => {
    for (const svg of [LOGO_MARK_SVG, LOGO_MARK_DARK_SVG, LOGO_MARK_INVERSE_SVG]) expect(svg).not.toMatch(/<image|<script|href="data:|on\w+=/i);
  });
});
