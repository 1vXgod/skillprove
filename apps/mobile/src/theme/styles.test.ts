import { colors, controlHeights, typography } from "@skillprove/shared/design";
import { describe, expect, it } from "vitest";
import { paletteFor, shadowStyle, textStyle } from "./styles";

describe("textStyle", () => {
  it("maps shared type tokens to React Native styles", () => {
    expect(textStyle("h1")).toEqual({ fontSize: 30, lineHeight: 38, fontWeight: "600", letterSpacing: -0.6 });
    expect(textStyle("body").fontWeight).toBe("400");
    expect(textStyle("body").fontSize).toBe(typography.body.fontSize);
  });
});

describe("shadowStyle", () => {
  it("gives iOS shadow props and an Android elevation", () => {
    const shadow = shadowStyle("md", "light");
    expect(shadow.elevation).toBeGreaterThan(0);
    expect(shadow.shadowOffset.height).toBe(4);
  });

  it("strengthens shadows on dark surfaces", () => {
    expect(shadowStyle("md", "dark").shadowOpacity).toBeGreaterThan(shadowStyle("md", "light").shadowOpacity);
  });
});

describe("theme palettes", () => {
  it("reads the shared tokens, not a copy", () => {
    expect(paletteFor("dark")).toBe(colors.dark);
    expect(paletteFor("light")).toBe(colors.light);
  });

  it("keeps the 44-point touch target used by mobile controls", () => {
    expect(controlHeights.touch).toBe(44);
  });
});
