import type { ColorTokens, TypeStyle } from "@skillprove/shared/design";
import { Text, type TextProps } from "react-native";
import { useTheme } from "../../theme/preferences-provider";
import { textStyle } from "../../theme/styles";

interface AppTextProps extends TextProps {
  variant?: TypeStyle;
  tone?: keyof Pick<ColorTokens, "foreground" | "mutedForeground" | "primary" | "accent" | "success" | "warning" | "destructive" | "info">;
}

/** Text in a shared type style and theme colour. Scales with the system font size. */
export function AppText({ variant = "body", tone = "foreground", style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  return <Text maxFontSizeMultiplier={1.6} style={[textStyle(variant), { color: colors[tone] }, style]} {...props} />;
}
