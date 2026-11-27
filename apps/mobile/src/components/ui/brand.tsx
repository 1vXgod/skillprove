import { Feather } from "@expo/vector-icons";
import { fontFamilies, radius, spacing } from "@skillprove/shared/design";
import { useId, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import { LOGO_MARK_DARK_SVG, LOGO_MARK_INVERSE_SVG, LOGO_MARK_SIZE, LOGO_MARK_SVG } from "@skillprove/shared/brand";
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from "react-native-svg";
import { useTheme } from "../../theme/preferences-provider";
import { shadowStyle } from "../../theme/styles";
import type { IconName } from "./button";
import { LightMark } from "./effects";
import { AppText } from "./text";

/*
 * Brand and dashboard pieces in the light-first style, matching the web kit. Every number comes
 * from the caller, so they never invent data.
 */

/**
 * The SkillProve mark, drawn from the same SVG the web serves (shared package). The lighter variant
 * shows in dark mode; `inverse` is white for navy backgrounds. Decorative: the wordmark carries the name.
 */
export function LogoMark({ size = 32, inverse = false }: { size?: number; inverse?: boolean }) {
  const { theme } = useTheme();
  const xml = inverse ? LOGO_MARK_INVERSE_SVG : theme === "dark" ? LOGO_MARK_DARK_SVG : LOGO_MARK_SVG;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width={size} height={(size * LOGO_MARK_SIZE.height) / LOGO_MARK_SIZE.width} />
    </View>
  );
}

/** Mark and wordmark. `inverse` is for navy backgrounds. */
export function Logo({ size = "md", inverse = false }: { size?: "sm" | "md" | "lg"; inverse?: boolean }) {
  const { colors } = useTheme();
  const mark = { sm: 22, md: 28, lg: 44 }[size];
  const text = { sm: "h4", md: "h3", lg: "h2" } as const;
  return (
    <View style={styles.logo} accessible accessibilityRole="header" accessibilityLabel="SkillProve">
      <LogoMark size={mark} inverse={inverse} />
      <AppText variant={text[size]} style={[styles.wordmark, { color: inverse ? colors.sidebarForeground : colors.foreground }]}>
        SkillProve
      </AppText>
    </View>
  );
}

/** One real number with its label. */
export function StatCard({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors, theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }, shadowStyle("card", theme)]} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={[styles.iconTile, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <AppText variant="h2">{value}</AppText>
      <AppText variant="bodySmall" tone="mutedForeground">
        {label}
      </AppText>
    </View>
  );
}

/** A skill in a list: name, a "score · level" line and an optional badge. With `onPress` it is a button. */
export function SkillRow({ icon, title, detail, medal, badge, onPress }: { icon?: IconName; title: string; detail: string; medal?: ReactNode; badge?: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = (
    <>
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: colors.secondary }]}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {detail}
        </AppText>
      </View>
      {medal}
      {badge}
      {onPress && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${detail}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
      {body}
    </Pressable>
  );
}

/** The navy hero card: serif headline, one line, one action and the light mark. */
/** The navy-to-blue panel behind the hero and the result score. Content goes on top. */
export function GradientPanel({ children, style, onLayout, ...props }: ViewProps) {
  const { colors, theme } = useTheme();
  const id = useId().replace(/:/g, "");
  // The gradient is drawn at the panel's measured size, in points, with its own rounded corners.
  // Percent sizes inside an absolutely placed Svg were taken from an early layout on iOS, so the
  // gradient stopped short of the panel's final width and height.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return (
    <View
      style={[styles.hero, shadowStyle("card", theme), style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
        onLayout?.(event);
      }}
      {...props}
    >
      {size && (
        <Svg style={styles.gradient} width={size.width} height={size.height} pointerEvents="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2={size.width} y2={size.height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={colors.sidebar} />
              <Stop offset="1" stopColor={colors.glowPrimary} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} rx={radius.xl} ry={radius.xl} fill={`url(#${id})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}

export function HeroCard({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <GradientPanel>
      <View style={styles.heroContent}>
        <View style={styles.flex}>
          <AppText variant="h2" accessibilityRole="header" style={{ color: colors.sidebarForeground }}>
            {title}
          </AppText>
          {body && <AppText style={{ color: colors.sidebarMuted }}>{body}</AppText>}
          {action && <View style={styles.heroAction}>{action}</View>}
        </View>
        <LightMark size={96} />
      </View>
    </GradientPanel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing[1] },
  logo: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  wordmark: { fontFamily: fontFamilies.native.sans[700], fontWeight: "700", letterSpacing: -0.3 },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.xl, padding: spacing[4], gap: spacing[1] },
  iconTile: { width: 40, height: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginBottom: spacing[1] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.lg, minHeight: 56 },
  // No overflow clipping: on iOS it also removes the shadow. The gradient rounds its own corners.
  hero: { borderRadius: radius.xl },
  gradient: { position: "absolute", top: 0, left: 0 },
  heroContent: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[5] },
  heroAction: { marginTop: spacing[3] },
});
