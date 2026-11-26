import { Feather } from "@expo/vector-icons";
import { durations, effects, radius, spacing, type ColorTokens } from "@skillprove/shared/design";
import { BlurView } from "expo-blur";
import { initials } from "@skillprove/shared/i18n";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, Platform, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { useI18n, useTheme } from "../../theme/preferences-provider";
import { shadowStyle } from "../../theme/styles";
import type { IconName } from "./button";
import { AppText } from "./text";

export function Separator({ vertical = false }: { vertical?: boolean }) {
  const { colors } = useTheme();
  return <View accessibilityElementsHidden importantForAccessibility="no" style={[vertical ? styles.vertical : styles.horizontal, { backgroundColor: colors.border }]} />;
}

/**
 * `solid` is the everyday card. `glass` is translucent with a thin glowing edge, for use over a
 * GlowBackground; on iOS it also blurs what is behind it. Android gets the translucent fill only.
 */
export function Card({ style, children, variant = "solid", ...props }: ViewProps & { variant?: "solid" | "glass" }) {
  const { colors, theme } = useTheme();
  if (variant === "solid") {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle("card", theme), style]} {...props}>
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.glass, { borderColor: colors.glassBorder }, style]} {...props}>
      {Platform.OS === "ios" && <BlurView intensity={Math.min(100, effects.blur * 2.5)} tint={theme} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassSurface }]} />
      {children}
    </View>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.flex}>
        <AppText variant="h4" accessibilityRole="header">
          {title}
        </AppText>
        {description && (
          <AppText variant="bodySmall" tone="mutedForeground">
            {description}
          </AppText>
        )}
      </View>
      {action}
    </View>
  );
}

export type Tone = "neutral" | "success" | "warning" | "error" | "info";

function toneColors(colors: ColorTokens, tone: Tone) {
  const map = {
    neutral: { text: colors.foreground, background: colors.muted, icon: "info" },
    success: { text: colors.success, background: colors.successSubtle, icon: "check-circle" },
    warning: { text: colors.warning, background: colors.warningSubtle, icon: "alert-triangle" },
    error: { text: colors.destructive, background: colors.destructiveSubtle, icon: "alert-circle" },
    info: { text: colors.info, background: colors.infoSubtle, icon: "info" },
  } as const satisfies Record<Tone, { text: string; background: string; icon: IconName }>;
  return map[tone];
}

export function Badge({ tone = "neutral", label }: { tone?: Tone; label: string }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.background }]}>
      <AppText variant="caption" style={[styles.badgeText, { color: c.text }]}>
        {label}
      </AppText>
    </View>
  );
}

const AVATAR_SIZES = { sm: 32, md: 40, lg: 56 } as const;

export function Avatar({ name, uri, size = "md" }: { name: string; uri?: string | null; size?: keyof typeof AVATAR_SIZES }) {
  const { colors } = useTheme();
  const dimension = AVATAR_SIZES[size];
  const frame: ViewStyle = { width: dimension, height: dimension, borderRadius: dimension / 2, backgroundColor: colors.secondary };
  return (
    <View accessibilityRole="image" accessibilityLabel={name} style={[styles.avatar, frame]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
      ) : (
        <AppText style={{ color: colors.secondaryForeground, fontSize: dimension * 0.38, fontWeight: "600" }} importantForAccessibility="no">
          {initials(name)}
        </AppText>
      )}
    </View>
  );
}

export function Spinner({ label, size = "small" }: { label?: string; size?: "small" | "large" }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return <ActivityIndicator size={size} color={colors.primary} accessibilityLabel={label ?? t("common.loading")} />;
}

/** A pulsing placeholder. Holds still when the user prefers reduced motion. */
export function Skeleton({ width, height = 16, style }: { width?: ViewStyle["width"]; height?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: durations.slow * 3, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: durations.slow * 3, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: width ?? "100%", height, borderRadius: radius.md, backgroundColor: colors.muted, opacity }, style]}
    />
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.track, { backgroundColor: colors.muted }]}
    >
      <View style={[styles.bar, { width: `${clamped}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

/** Errors are announced assertively, other tones politely. */
export function Alert({ tone = "info", title, message }: { tone?: Exclude<Tone, "neutral">; title?: string; message?: string }) {
  const { colors } = useTheme();
  const c = toneColors(colors, tone);
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : "summary"}
      accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
      style={[styles.alert, { backgroundColor: c.background, borderColor: c.text }]}
    >
      <Feather name={c.icon} size={20} color={c.text} style={styles.alertIcon} />
      <View style={styles.flex}>
        {title && (
          <AppText variant="label" style={{ color: c.text }}>
            {title}
          </AppText>
        )}
        {message && <AppText variant="bodySmall">{message}</AppText>}
      </View>
    </View>
  );
}

export function EmptyState({ icon = "inbox", title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={22} color={colors.mutedForeground} />
      </View>
      <AppText variant="h4" style={styles.center}>
        {title}
      </AppText>
      {description && (
        <AppText variant="bodySmall" tone="mutedForeground" style={styles.center}>
          {description}
        </AppText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  horizontal: { height: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing[5], gap: spacing[4] },
  glass: { borderRadius: radius.xl, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  badge: { alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: spacing[0.5] },
  badgeText: { fontWeight: "500" },
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  track: { height: 8, borderRadius: radius.full, overflow: "hidden", alignSelf: "stretch" },
  bar: { height: "100%", borderRadius: radius.full },
  alert: { flexDirection: "row", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  alertIcon: { marginTop: 1 },
  empty: { alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[6], paddingVertical: spacing[10], borderWidth: 1, borderStyle: "dashed", borderRadius: radius.lg },
  emptyIcon: { width: 48, height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});
