import { Feather } from "@expo/vector-icons";
import { controlHeights, iconSizes, radius, spacing, type ControlSize } from "@skillprove/shared/design";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { useTheme } from "../../theme/preferences-provider";
import { textStyle } from "../../theme/styles";
import { AppText } from "./text";

export type IconName = ComponentProps<typeof Feather>["name"];
export type ButtonVariant = "primary" | "glow" | "secondary" | "outline" | "ghost" | "destructive" | "link";

const PADDING: Record<ControlSize, number> = { sm: spacing[3], md: spacing[4], lg: spacing[5] };

function useVariantColors(variant: ButtonVariant) {
  const { colors } = useTheme();
  const map = {
    primary: { background: colors.primary, pressed: colors.primaryHover, text: colors.primaryForeground, border: "transparent" },
    glow: { background: colors.primary, pressed: colors.primaryHover, text: colors.primaryForeground, border: "transparent" },
    secondary: { background: colors.secondary, pressed: colors.muted, text: colors.secondaryForeground, border: "transparent" },
    outline: { background: colors.surface, pressed: colors.muted, text: colors.foreground, border: colors.input },
    ghost: { background: "transparent", pressed: colors.muted, text: colors.foreground, border: "transparent" },
    destructive: { background: colors.destructive, pressed: colors.destructive, text: colors.destructiveForeground, border: "transparent" },
    link: { background: "transparent", pressed: "transparent", text: colors.accent, border: "transparent" },
  } as const;
  return map[variant];
}

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
}

/** Every size keeps a 44-point touch target; small buttons extend it with hitSlop. */
export function Button({ label, variant = "primary", size = "md", loading = false, icon, disabled, fullWidth = false, ...props }: ButtonProps) {
  const c = useVariantColors(variant);
  const glowColor = useTheme().colors.glowPrimary;
  const height = controlHeights[size];
  const inactive = disabled || loading;
  const slop = Math.max(0, (controlHeights.touch - height) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
      disabled={inactive}
      hitSlop={slop}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: variant === "link" ? undefined : height,
          paddingHorizontal: variant === "link" ? 0 : PADDING[size],
          backgroundColor: pressed ? c.pressed : c.background,
          borderColor: c.border,
          opacity: inactive ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        // The main call to action: a soft brand glow (a coloured shadow on iOS, elevation on Android).
        variant === "glow" && { shadowColor: glowColor, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={c.text} /> : icon && <Feather name={icon} size={iconSizes.sm} color={c.text} />}
      <AppText style={[textStyle("button"), { color: c.text }, variant === "link" && styles.link]}>{label}</AppText>
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  /** Required: an icon alone has no accessible name. */
  label: string;
  icon: IconName;
  variant?: Exclude<ButtonVariant, "link">;
}

export function IconButton({ label, icon, variant = "ghost", disabled, ...props }: IconButtonProps) {
  const c = useVariantColors(variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: pressed ? c.pressed : c.background, borderColor: c.border, opacity: disabled ? 0.5 : 1 },
      ]}
      {...props}
    >
      <View pointerEvents="none">
        <Feather name={icon} size={iconSizes.md} color={c.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  link: { textDecorationLine: "underline" },
  icon: {
    width: controlHeights.touch,
    height: controlHeights.touch,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
