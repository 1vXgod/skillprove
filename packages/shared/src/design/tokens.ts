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
  /** Soft light behind hero areas (the landing page). Used at low opacity, never for text. */
  glowPrimary: string;
  glowSecondary: string;
  /** The two ends of the gradient on a headline's key word. Each meets AA as text on `background`. */
  gradientFrom: string;
  gradientTo: string;
  /** Translucent card fill and its thin brand-tinted edge, for glass surfaces over a glow. */
  glassSurface: string;
  glassBorder: string;
  /** The web app's navigation sidebar: deep navy in both themes, with its own text and active item. */
  sidebar: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarActiveForeground: string;
  sidebarBorder: string;
  /** Skill medals: a face and a deeper rim for each. Decorative, always with a text label. */
  medalGold: string;
  medalGoldRim: string;
  medalSilver: string;
  medalSilverRim: string;
  medalBronze: string;
  medalBronzeRim: string;
}

/**
 * Deep indigo for identity, a clear blue for focus and links, neutral greys with a slight cool
 * tint. Pairs used for text are checked against WCAG AA in tokens.test.ts.
 */
export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    background: "#f4f5fc",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    foreground: "#141a3d",
    mutedForeground: "#5b6280",
    muted: "#eef0fa",
    border: "#e3e6f3",
    input: "#c4cae2",
    ring: "#2f5be0",
    primary: "#2f5be0",
    primaryForeground: "#ffffff",
    primaryHover: "#2549c4",
    secondary: "#e8edfd",
    secondaryForeground: "#1e2a6b",
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
    glowPrimary: "#2f5be0",
    glowSecondary: "#8f8cf3",
    gradientFrom: "#222c6e",
    gradientTo: "#2f5be0",
    glassSurface: "rgba(255, 255, 255, 0.62)",
    glassBorder: "rgba(47, 91, 224, 0.22)",
    sidebar: "#1b2363",
    sidebarForeground: "#ffffff",
    sidebarMuted: "#b9c0e8",
    sidebarActive: "#2d3891",
    sidebarActiveForeground: "#ffffff",
    sidebarBorder: "#28317a",
    medalGold: "#e8b730",
    medalGoldRim: "#a8790c",
    medalSilver: "#c9cfdb",
    medalSilverRim: "#7c8597",
    medalBronze: "#d08a4f",
    medalBronzeRim: "#8f5326",
  },
  dark: {
    background: "#080b1a",
    surface: "#0f1430",
    surfaceRaised: "#151b3c",
    foreground: "#e9ecf7",
    mutedForeground: "#a3abc8",
    muted: "#19204a",
    border: "#232b55",
    input: "#3b4578",
    ring: "#7b98ff",
    primary: "#a9b4ff",
    primaryForeground: "#0f1430",
    primaryHover: "#c0c8ff",
    secondary: "#1c2350",
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
    glowPrimary: "#2f5be0",
    glowSecondary: "#4b5fd6",
    gradientFrom: "#c0c8ff",
    gradientTo: "#6f93ff",
    glassSurface: "rgba(15, 20, 48, 0.58)",
    glassBorder: "rgba(111, 147, 255, 0.24)",
    sidebar: "#0b1029",
    sidebarForeground: "#e9ecf7",
    sidebarMuted: "#a3abc8",
    sidebarActive: "#1c2456",
    sidebarActiveForeground: "#ffffff",
    sidebarBorder: "#1a2047",
    medalGold: "#f0c44a",
    medalGoldRim: "#b8871a",
    medalSilver: "#d5dbe5",
    medalSilverRim: "#8e97aa",
    medalBronze: "#dd9a60",
    medalBronzeRim: "#a2632f",
  },
};

/**
 * DM Serif Display for headlines and Plus Jakarta Sans for everything else, including the
 * wordmark. Both cover Latin Extended, so ë and ç render. Web loads them with next/font; mobile
 * bundles the files (assets/fonts) and needs one family name per weight.
 */
export const fontFamilies = {
  web: {
    sans: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    display: "var(--font-display), Georgia, 'Times New Roman', serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  native: {
    sans: { 400: "PlusJakartaSans_400Regular", 500: "PlusJakartaSans_500Medium", 600: "PlusJakartaSans_600SemiBold", 700: "PlusJakartaSans_700Bold" },
    display: "DMSerifDisplay_400Regular",
    displayItalic: "DMSerifDisplay_400Regular_Italic",
    mono: "monospace",
  },
} as const;

export const TYPE_STYLES = [
  "hero",
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
  /** Web only: a larger size from the `md` breakpoint up, for headlines that must still fit a 360 px phone. */
  wide?: { fontSize: number; lineHeight: number };
  /** `display` uses the headline serif; everything else the sans. */
  family?: "display";
}

export const typography: Record<TypeStyle, TypeToken> = {
  hero: { fontSize: 46, lineHeight: 52, fontWeight: 400, letterSpacing: -0.01, wide: { fontSize: 76, lineHeight: 82 }, family: "display" },
  display: { fontSize: 40, lineHeight: 48, fontWeight: 400, letterSpacing: -0.01, family: "display" },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: 400, letterSpacing: -0.005, family: "display" },
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
export const radius = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;
export type RadiusName = keyof typeof radius;

export const SHADOW_NAMES = ["sm", "md", "lg", "card"] as const;
export type ShadowName = (typeof SHADOW_NAMES)[number];

export interface ShadowToken {
  offsetY: number;
  blur: number;
  /** 0 to 1, applied to `shadowColor`. */
  opacity: number;
  /** Android elevation, the closest equivalent. */
  elevation: number;
}

/** Shadows are black at varying opacity. React Native needs the colour spelled out. */
/** A navy tint, so shadows on the lavender page look soft rather than grey. */
export const shadowColor = "#141a3d";

/** `sm`, `md` and `lg` are for things that float (menus, dialogs, tooltips); `card` is the soft lift under cards. */
export const shadows: Record<ShadowName, ShadowToken> = {
  sm: { offsetY: 1, blur: 3, opacity: 0.06, elevation: 1 },
  md: { offsetY: 6, blur: 18, opacity: 0.09, elevation: 4 },
  lg: { offsetY: 16, blur: 40, opacity: 0.14, elevation: 12 },
  card: { offsetY: 8, blur: 28, opacity: 0.07, elevation: 2 },
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

/**
 * Strength of the decorative light, per theme: glows are softer on light backgrounds. Opacities
 * from 0 to 1. `blur` is the glass blur radius in pixels or points.
 */
export const effects = {
  light: { glowOpacity: 0.28, gridOpacity: 0.55 },
  dark: { glowOpacity: 0.7, gridOpacity: 0.35 },
  blur: 16,
} as const;

/**
 * Slow, decorative motion (the drifting glow, the entrance fade), kept apart from `durations`,
 * which are short and functional. Both platforms turn it off when reduced motion is on.
 */
export const ambientMotion = { driftMs: 24_000, revealMs: 700 } as const;

export const zIndex = { base: 0, sticky: 20, overlay: 40, modal: 50, popover: 60, tooltip: 70 } as const;

/** Top bar and sidebar sizes for the application shell. */
export const layout = { headerHeight: 56, sidebarWidth: 248, contentMaxWidth: 1120 } as const;
