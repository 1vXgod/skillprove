import {
  breakpoints,
  colors,
  durations,
  easing,
  fontFamilies,
  layout,
  radius,
  shadows,
  SHADOW_NAMES,
  TYPE_STYLES,
  typography,
  zIndex,
  type ColorTokens,
} from "./tokens";

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `--sp-primary-foreground`. Web's Tailwind theme maps each to a class such as `bg-primary-foreground`. */
export const colorVariable = (name: keyof ColorTokens) => `--sp-${kebab(name)}`;

function colorDeclarations(tokens: ColorTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${colorVariable(name as keyof ColorTokens)}:${value};`)
    .join("");
}

function shadowValue(name: (typeof SHADOW_NAMES)[number], theme: "light" | "dark"): string {
  const { offsetY, blur, opacity } = shadows[name];
  // Dark surfaces need a stronger shadow to read at all.
  const alpha = theme === "dark" ? Math.min(opacity * 3, 0.5) : opacity;
  return `0 ${offsetY}px ${blur}px rgba(0,0,0,${alpha.toFixed(2)})`;
}

function themeDeclarations(theme: "light" | "dark"): string {
  const shadowVars = SHADOW_NAMES.map((name) => `--sp-shadow-${name}:${shadowValue(name, theme)};`).join("");
  return `${colorDeclarations(colors[theme])}${shadowVars}color-scheme:${theme};`;
}

function staticDeclarations(): string {
  const radii = Object.entries(radius).map(([name, value]) => `--sp-radius-${name}:${value}px;`);
  const motion = Object.entries(durations).map(([name, value]) => `--sp-duration-${name}:${value}ms;`);
  const layers = Object.entries(zIndex).map(([name, value]) => `--sp-z-${name}:${value};`);
  const sizes = Object.entries(layout).map(([name, value]) => `--sp-${kebab(name)}:${value}px;`);
  const fonts = [`--sp-font-sans:${fontFamilies.web.sans};`, `--sp-font-mono:${fontFamilies.web.mono};`];
  return [...radii, ...motion, ...layers, ...sizes, ...fonts, `--sp-ease-standard:${easing.standard};`].join("");
}

function typeClasses(): string {
  return TYPE_STYLES.map((style) => {
    const t = typography[style];
    const name = `.type-${kebab(style)}`;
    const base = `${name}{font-size:${t.fontSize / 16}rem;line-height:${t.lineHeight / 16}rem;font-weight:${t.fontWeight};letter-spacing:${t.letterSpacing}em;}`;
    if (!t.wide) return base;
    return `${base}@media (min-width:${breakpoints.md / 16}rem){${name}{font-size:${t.wide.fontSize / 16}rem;line-height:${t.wide.lineHeight / 16}rem;}}`;
  }).join("");
}

/**
 * The stylesheet web injects in its root layout. `data-theme` on <html> selects a theme;
 * "system" follows the operating system with no script, so the first paint is already correct.
 * The selectors also work on any element, so a section can preview the other theme.
 */
export function designTokensCss(): string {
  const light = themeDeclarations("light");
  const dark = themeDeclarations("dark");
  return [
    `:root{${staticDeclarations()}}`,
    `:root,[data-theme="light"]{${light}}`,
    `[data-theme="dark"]{${dark}}`,
    `@media (prefers-color-scheme: dark){[data-theme="system"]{${dark}}}`,
    typeClasses(),
  ].join("");
}
