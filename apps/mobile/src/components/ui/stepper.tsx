import { Feather } from "@expo/vector-icons";
import { spacing } from "@skillprove/shared/design";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/preferences-provider";
import { AppText } from "./text";

export type StepState = "done" | "active" | "pending" | "failed" | "cancelled";

const DOT = 32;

/** Steps in order, each with its state, which is also read out in words (`stateLabel`). */
export function Stepper({ steps }: { steps: { key: string; label: string; state: StepState; stateLabel: string }[] }) {
  const { colors } = useTheme();
  const look = (state: StepState) =>
    ({
      done: { border: colors.success, background: colors.successSubtle, fg: colors.success },
      active: { border: colors.primary, background: colors.secondary, fg: colors.primary },
      pending: { border: colors.border, background: colors.surface, fg: colors.mutedForeground },
      failed: { border: colors.destructive, background: colors.destructiveSubtle, fg: colors.destructive },
      cancelled: { border: colors.border, background: colors.muted, fg: colors.mutedForeground },
    })[state];
  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const c = look(step.state);
        const reached = step.state === "done" || step.state === "active";
        return (
          <View key={step.key} style={styles.step} accessible accessibilityLabel={`${index + 1}. ${step.label}: ${step.stateLabel}`}>
            {index > 0 && <View style={[styles.line, { backgroundColor: reached ? colors.primary : colors.border }]} />}
            <View style={[styles.dot, { borderColor: c.border, backgroundColor: c.background }]}>
              {step.state === "active" ? (
                <ActivityIndicator size="small" color={c.fg} />
              ) : step.state === "done" ? (
                <Feather name="check" size={16} color={c.fg} />
              ) : step.state === "failed" || step.state === "cancelled" ? (
                <Feather name="x" size={16} color={c.fg} />
              ) : (
                <AppText variant="label" style={{ color: c.fg }}>
                  {index + 1}
                </AppText>
              )}
            </View>
            <AppText variant="caption" style={[styles.label, { color: step.state === "failed" ? colors.destructive : step.state === "pending" || step.state === "cancelled" ? colors.mutedForeground : colors.foreground }]}>
              {step.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, alignItems: "center", gap: spacing[2] },
  line: { position: "absolute", top: DOT / 2 - 1, right: "50%", width: "100%", height: 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  label: { textAlign: "center", fontWeight: "500" },
});
