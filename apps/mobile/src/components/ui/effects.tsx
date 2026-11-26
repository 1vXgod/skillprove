import { ambientMotion, effects, fontFamilies, type TypeStyle } from "@skillprove/shared/design";
import { useEffect, useId, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type LayoutRectangle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { useTheme } from "../../theme/preferences-provider";
import { textStyle } from "../../theme/styles";
import { AppText } from "./text";

/*
 * The modern look as native pieces, matching the web kit (design system "Effects"). Colours and
 * strengths come from the shared tokens. All of it is decorative and hidden from VoiceOver, and
 * iOS "Reduce Motion" makes it still.
 */

// Decorative geometry, in points: the glows are larger than a phone screen so their edges never show.
const GLOW_SIZE = 460;

/** A slow loop from 0 to 1 and back, or a still 0 when reduced motion is on. */
function useDrift(durationMs: number, reduced: boolean) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: durationMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: durationMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, durationMs, reduced]);
  return value;
}

function Glow({ color, id }: { color: string; id: string }) {
  return (
    <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={1} />
          <Stop offset="65%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Brand-coloured light behind a screen or section. Put it first inside a container with
 * `overflow: "hidden"`. Two glows drift slowly; with reduced motion they stay still.
 */
export function GlowBackground() {
  const { colors, theme } = useTheme();
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const a = useDrift(ambientMotion.driftMs, reduced);
  const b = useDrift(ambientMotion.driftMs * 1.25, reduced);
  const move = (value: Animated.Value, dx: number, dy: number) => ({
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
    ],
  });
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { opacity: effects[theme].glowOpacity }]}>
      <Animated.View style={[styles.glowA, move(a, 60, 40)]}>
        <Glow color={colors.glowPrimary} id={`${id}a`} />
      </Animated.View>
      <Animated.View style={[styles.glowB, move(b, -50, 30)]}>
        <Glow color={colors.glowSecondary} id={`${id}b`} />
      </Animated.View>
    </View>
  );
}

/**
 * One accent word or short phrase in the brand gradient, on a single line (SVG text does not
 * wrap). It measures the real text, so it follows the system text size. VoiceOver reads the word.
 */
export function GradientText({ children, variant = "display", header = false }: { children: string; variant?: TypeStyle; header?: boolean }) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, "");
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const base = textStyle(variant);
  // The measured line height over the token's gives the system text-size scale.
  const scale = box ? box.height / base.lineHeight : 1;
  const fontSize = base.fontSize * scale;
  return (
    <View accessible accessibilityRole={header ? "header" : "text"} accessibilityLabel={children} style={styles.gradientText}>
      <AppText variant={variant} numberOfLines={1} onLayout={(event) => setBox(event.nativeEvent.layout)} style={[styles.hidden, styles.accentFont]} importantForAccessibility="no">
        {children}
      </AppText>
      {box && (
        <Svg width={box.width} height={box.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.gradientFrom} />
              <Stop offset="1" stopColor={colors.gradientTo} />
            </LinearGradient>
          </Defs>
          <SvgText
            x={0}
            // Baseline: middle of the line box plus about a third of the font size (cap height / 2).
            y={box.height / 2 + fontSize * 0.35}
            fontSize={fontSize}
            // The accent is the italic headline serif, as on the web.
            fontFamily={fontFamilies.native.displayItalic}
            letterSpacing={base.letterSpacing * scale}
            fill={`url(#${id})`}
          >
            {children}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

/** The abstract "verified" mark made of light, breathing slowly. Decorative; never shows data. */
export function LightMark({ size = 200 }: { size?: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const breathe = useDrift(3000, reduced);
  const opacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 320 320">
        <Defs>
          <RadialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.glowPrimary} stopOpacity={0.55} />
            <Stop offset="70%" stopColor={colors.glowSecondary} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={colors.glowSecondary} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.gradientFrom} />
            <Stop offset="1" stopColor={colors.gradientTo} />
          </LinearGradient>
        </Defs>
        <Circle cx={160} cy={160} r={156} fill={`url(#${id}g)`} />
        <Circle cx={160} cy={160} r={128} fill="none" stroke={`url(#${id}s)`} strokeWidth={1} />
        <Circle cx={160} cy={160} r={102} fill="none" stroke={`url(#${id}s)`} strokeWidth={1.25} strokeDasharray="2 10" strokeLinecap="round" />
        <Circle cx={160} cy={160} r={78} fill="none" stroke={`url(#${id}s)`} strokeWidth={1.5} />
        <Circle cx={288} cy={160} r={3} fill={colors.gradientTo} />
        <Circle cx={88} cy={88} r={2.5} fill={colors.gradientFrom} />
        <Circle cx={210} cy={250} r={2} fill={colors.gradientTo} />
        <Circle cx={160} cy={160} r={52} fill={colors.background} fillOpacity={0.55} stroke={`url(#${id}s)`} strokeWidth={2} />
        <Path d="M138 161 l15 15 l30 -32" fill="none" stroke={`url(#${id}s)`} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowA: { position: "absolute", left: -GLOW_SIZE * 0.45, top: -GLOW_SIZE * 0.5 },
  glowB: { position: "absolute", right: -GLOW_SIZE * 0.5, top: GLOW_SIZE * 0.1 },
  gradientText: { alignSelf: "flex-start" },
  hidden: { opacity: 0 },
  accentFont: { fontFamily: fontFamilies.native.displayItalic, fontWeight: "400" },
});
