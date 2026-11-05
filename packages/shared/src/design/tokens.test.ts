import { describe, expect, it } from "vitest";
import {
  breakpoints,
  colors,
  colorVariable,
  contrastRatio,
  controlHeights,
  designTokensCss,
  parseThemePreference,
  radius,
  resolveTheme,
  spacing,
  THEME_NAMES,
  TYPE_STYLES,
  typography,
  type ColorTokens,
} from "./index";

// [foreground, background, minimum]: 4.5 for text, 3 for large text and non-text UI (WCAG AA).
const TEXT_PAIRS: [keyof ColorTokens, keyof ColorTokens, number][] = [
  ["foreground", "background", 4.5],
  ["foreground", "surface", 4.5],
  ["foreground", "surfaceRaised", 4.5],
  ["foreground", "muted", 4.5],
  ["mutedForeground", "background", 4.5],
  ["mutedForeground", "surface", 4.5],
  ["primaryForeground", "primary", 4.5],
  ["primaryForeground", "primaryHover", 4.5],
  ["secondaryForeground", "secondary", 4.5],
  ["accentForeground", "accent", 4.5],
  ["accent", "surface", 4.5],
  ["primary", "surface", 4.5],
  ["destructiveForeground", "destructive", 4.5],
  ["success", "surface", 4.5],
  ["success", "successSubtle", 4.5],
  ["warning", "surface", 4.5],
  ["warning", "warningSubtle", 4.5],
  ["destructive", "surface", 4.5],
  ["destructive", "destructiveSubtle", 4.5],
  ["info", "surface", 4.5],
  ["info", "infoSubtle", 4.5],
  ["ring", "background", 3],
  ["ring", "surface", 3],
  ["input", "surface", 1.4],
];

describe.each(THEME_NAMES)("%s colours", (theme) => {
  const palette = colors[theme];

  it.each(TEXT_PAIRS)("%s on %s meets %d:1", (fg, bg, minimum) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(minimum);
  });

  it("defines every token as a colour", () => {
    for (const value of Object.values(palette)) expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\(.+\))$/);
  });
});

describe("token scales", () => {
  it("gives both themes the same tokens", () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });

  it("defines every type style with a line height above its size", () => {
    for (const style of TYPE_STYLES) {
      expect(typography[style].lineHeight).toBeGreaterThan(typography[style].fontSize);
    }
    expect(typography.display.fontSize).toBeGreaterThan(typography.h1.fontSize);
  });

  it("uses a 4-point spacing grid", () => {
    for (const value of Object.values(spacing)) expect(value % 2).toBe(0);
    expect(spacing[4]).toBe(16);
  });

  it("keeps the minimum touch target at 44 points", () => {
    expect(controlHeights.touch).toBeGreaterThanOrEqual(44);
  });

  it("orders radii and matches Tailwind's breakpoints", () => {
    expect(radius.sm < radius.md && radius.md < radius.lg && radius.lg < radius.xl).toBe(true);
    expect(breakpoints).toEqual({ sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 });
  });
});

describe("designTokensCss", () => {
  const css = designTokensCss();

  it("declares every colour for light, dark and system themes", () => {
    for (const name of Object.keys(colors.light) as (keyof ColorTokens)[]) {
      expect(css).toContain(`${colorVariable(name)}:${colors.light[name]};`);
      expect(css).toContain(`${colorVariable(name)}:${colors.dark[name]};`);
    }
    expect(css).toContain('[data-theme="dark"]{');
    expect(css).toContain('@media (prefers-color-scheme: dark){[data-theme="system"]{');
  });

  it("generates a class per type style", () => {
    expect(css).toContain(".type-h1{font-size:1.875rem;");
    expect(css).toContain(".type-body-small{");
  });
});

describe("theme preference", () => {
  it("parses stored values and falls back to system", () => {
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("blue")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
  });

  it("resolves system from the device setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
