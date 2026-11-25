import { colors, shadowColor, shadows, typography, type ColorTokens, type ShadowName, type ThemeName, type TypeStyle } from "@skillprove/shared/design";

/** React Native wants string weights. */
const WEIGHTS = { 400: "400", 500: "500", 600: "600", 700: "700" } as const;

export interface NativeTextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: (typeof WEIGHTS)[keyof typeof WEIGHTS];
  letterSpacing: number;
}

/** A shared type token as a React Native text style. Letter spacing goes from em to points. */
export function textStyle(style: TypeStyle): NativeTextStyle {
  const t = typography[style];
  return {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    fontWeight: WEIGHTS[t.fontWeight],
    letterSpacing: Number((t.letterSpacing * t.fontSize).toFixed(2)),
  };
}

/** iOS shadow props plus Android elevation for a shared shadow token. */
export function shadowStyle(name: ShadowName, theme: ThemeName) {
  const s = shadows[name];
  return {
    shadowColor,
    shadowOffset: { width: 0, height: s.offsetY },
    shadowRadius: s.blur / 2,
    shadowOpacity: theme === "dark" ? Math.min(s.opacity * 3, 0.5) : s.opacity,
    elevation: s.elevation,
  };
}

export function paletteFor(theme: ThemeName): ColorTokens {
  return colors[theme];
}
