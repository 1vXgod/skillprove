import { colors, controlHeights, fontFamilies, shadows, typography } from "@skillprove/shared/design";
import { describe, expect, it } from "vitest";
import { paletteFor, shadowStyle, textStyle } from "./styles";

describe("textStyle", () => {
  it("maps shared type tokens to React Native styles", () => {
    expect(textStyle("h1")).toEqual({ fontFamily: "DMSerifDisplay_400Regular", fontSize: 32, lineHeight: 40, fontWeight: "400", letterSpacing: -0.16 });
    expect(textStyle("body").fontWeight).toBe("400");
    expect(textStyle("body").fontSize).toBe(typography.body.fontSize);
  });

  it("uses the headline serif for display styles and the sans file matching each weight", () => {
    expect(textStyle("hero").fontFamily).toBe(fontFamilies.native.display);
    expect(textStyle("body").fontFamily).toBe(fontFamilies.native.sans[400]);
    expect(textStyle("label").fontFamily).toBe(fontFamilies.native.sans[500]);
    expect(textStyle("h4").fontFamily).toBe(fontFamilies.native.sans[600]);
  });
});

describe("shadowStyle", () => {
  it("gives iOS shadow props and an Android elevation", () => {
    const shadow = shadowStyle("md", "light");
    expect(shadow.elevation).toBeGreaterThan(0);
    expect(shadow.shadowOffset.height).toBe(shadows.md.offsetY);
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
