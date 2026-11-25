/**
 * The single source of SkillProve's design decisions. Web turns these into CSS variables
 * (see ./css.ts) and mobile reads them directly. Never copy a value into an app.
 */

export const THEME_NAMES = ["light", "dark"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceRaised: string;
  foreground: string;
  mutedForeground: string;
  muted: string;
  border: string;
  input: string;
  ring: string;
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSubtle: string;
  info: string;
  infoSubtle: string;
  overlay: string;
}

/**
 * Deep indigo for identity, a clear blue for focus and links, neutral greys with a slight cool
 * tint. Pairs used for text are checked against WCAG AA in tokens.test.ts.
 */
export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    background: "#f6f7f9",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    foreground: "#161a23",
    mutedForeground: "#596273",
    muted: "#eef0f4",
    border: "#e1e4ea",
    input: "#c9ced8",
    ring: "#2f5be0",
    primary: "#222c6e",
    primaryForeground: "#ffffff",
    primaryHover: "#1a2258",
    secondary: "#eceef6",
    secondaryForeground: "#1e2654",
    accent: "#2f5be0",
    accentForeground: "#ffffff",
    success: "#14724f",
    successSubtle: "#e6f4ee",
    warning: "#8f5200",
    warningSubtle: "#fcf1de",
    destructive: "#b8303b",
    destructiveForeground: "#ffffff",
    destructiveSubtle: "#fbeaeb",
    info: "#2453c4",
    infoSubtle: "#e8eefb",
    overlay: "rgba(13, 16, 24, 0.5)",
  },
  dark: {
    background: "#0c0f15",
    surface: "#141821",
    surfaceRaised: "#1a1f2a",
    foreground: "#e9ebf0",
    mutedForeground: "#9ba3b3",
    muted: "#1e2430",
    border: "#272d3a",
    input: "#3a4252",
    ring: "#7b98ff",
    primary: "#a9b4ff",
    primaryForeground: "#0f1430",
    primaryHover: "#c0c8ff",
    secondary: "#1f2535",
    secondaryForeground: "#dfe3f5",
    accent: "#7b98ff",
    accentForeground: "#0c0f15",
    success: "#4cc994",
    successSubtle: "#12291f",
    warning: "#f2b551",
    warningSubtle: "#2d2210",
    destructive: "#f27c85",
    destructiveForeground: "#1f0a0c",
    destructiveSubtle: "#2e1417",
    info: "#7fb0ff",
    infoSubtle: "#142238",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
};

export const fontFamilies = {
  /** Inter covers Latin Extended, including ë and ç. Loaded by next/font on web. */
  web: { sans: "var(--font-inter), ui-sans-serif, system-ui, sans-serif", mono: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  /** System fonts (San Francisco, Roboto) also cover Albanian, and need no download. */
  native: { sans: undefined, mono: "monospace" },
} as const;

export const TYPE_STYLES = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "bodyLarge",
  "body",
  "bodySmall",
  "label",
  "caption",
  "button",
] as const;
export type TypeStyle = (typeof TYPE_STYLES)[number];

export interface TypeToken {
  /** Pixels on web, points on mobile. */
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 500 | 600 | 700;
  /** Em units. */
  letterSpacing: number;
}

export const typography: Record<TypeStyle, TypeToken> = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: 600, letterSpacing: -0.022 },
  h1: { fontSize: 30, lineHeight: 38, fontWeight: 600, letterSpacing: -0.02 },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: 600, letterSpacing: -0.016 },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: 600, letterSpacing: -0.012 },
  h4: { fontSize: 17, lineHeight: 24, fontWeight: 600, letterSpacing: -0.008 },
  bodyLarge: { fontSize: 17, lineHeight: 26, fontWeight: 400, letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: 400, letterSpacing: 0 },
  bodySmall: { fontSize: 13, lineHeight: 20, fontWeight: 400, letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: 500, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400, letterSpacing: 0.004 },
  button: { fontSize: 14, lineHeight: 20, fontWeight: 600, letterSpacing: 0 },
};

/** A 4-point scale. Keys are steps, values are pixels or points. */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;
export type SpacingStep = keyof typeof spacing;

/** Restrained corners: controls use md, cards lg. Pills only for badges and avatars. */
export const radius = { sm: 4, md: 6, lg: 8, xl: 12, full: 9999 } as const;
export type RadiusName = keyof typeof radius;

export const SHADOW_NAMES = ["sm", "md", "lg"] as const;
export type ShadowName = (typeof SHADOW_NAMES)[number];

export interface ShadowToken {
  offsetY: number;
  blur: number;
  /** 0 to 1, applied to black. */
  opacity: number;
  /** Android elevation, the closest equivalent. */
  elevation: number;
}

/** Shadows are black at varying opacity. React Native needs the colour spelled out. */
export const shadowColor = "#000000";

/** Only for things that float above the page: menus, dialogs, tooltips. */
export const shadows: Record<ShadowName, ShadowToken> = {
  sm: { offsetY: 1, blur: 2, opacity: 0.06, elevation: 1 },
  md: { offsetY: 4, blur: 12, opacity: 0.08, elevation: 4 },
  lg: { offsetY: 12, blur: 32, opacity: 0.14, elevation: 12 },
};

/** Control heights. `touch` is the minimum tap target on mobile. */
export const controlHeights = { sm: 32, md: 40, lg: 48, touch: 44 } as const;
export type ControlSize = "sm" | "md" | "lg";

export const iconSizes = { sm: 16, md: 20, lg: 24 } as const;

/** Equal to Tailwind's defaults, so web needs no override. Mobile uses them for wide layouts. */
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;

/** Milliseconds. Motion is short and functional; both platforms skip it when reduced motion is on. */
export const durations = { fast: 120, normal: 180, slow: 240 } as const;
export const easing = { standard: "cubic-bezier(0.2, 0, 0, 1)" } as const;

export const zIndex = { base: 0, sticky: 20, overlay: 40, modal: 50, popover: 60, tooltip: 70 } as const;

/** Top bar and sidebar sizes for the application shell. */
export const layout = { headerHeight: 56, sidebarWidth: 248, contentMaxWidth: 1120 } as const;
