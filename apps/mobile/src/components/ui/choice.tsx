import { Feather } from "@expo/vector-icons";
import { controlHeights, radius, spacing } from "@skillprove/shared/design";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch as NativeSwitch, View } from "react-native";
import { useTheme } from "../../theme/preferences-provider";
import { AppText } from "./text";

interface ChoiceProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ChoiceRow({ label, description, control, disabled }: { label: string; description?: string; control: ReactNode; disabled?: boolean }) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {control}
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {description && (
          <AppText variant="bodySmall" tone="mutedForeground">
            {description}
          </AppText>
        )}
      </View>
    </View>
  );
}

/** The whole row is the target, at least 44 points tall. */
export function Checkbox({ label, description, checked, onChange, disabled }: ChoiceProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={styles.target}
    >
      <ChoiceRow
        label={label}
        description={description}
        disabled={disabled}
        control={
          <View style={[styles.box, { borderColor: checked ? colors.primary : colors.input, backgroundColor: checked ? colors.primary : colors.surface }]}>
            {checked && <Feather name="check" size={14} color={colors.primaryForeground} />}
          </View>
        }
      />
    </Pressable>
  );
}

interface RadioGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function RadioGroup<T extends string>({ label, options, value, onChange, disabled }: RadioGroupProps<T>) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      <AppText variant="label">{label}</AppText>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={styles.target}
          >
            <ChoiceRow
              label={option.label}
              description={option.description}
              disabled={disabled}
              control={
                <View style={[styles.box, styles.radio, { borderColor: selected ? colors.primary : colors.input, backgroundColor: selected ? colors.primary : colors.surface }]}>
                  {selected && <View style={[styles.dot, { backgroundColor: colors.primaryForeground }]} />}
                </View>
              }
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The platform switch, coloured from the tokens. */
export function Switch({ label, description, checked, onChange, disabled }: ChoiceProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, disabled && styles.disabled]}>
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {description && (
          <AppText variant="bodySmall" tone="mutedForeground">
            {description}
          </AppText>
        )}
      </View>
      <NativeSwitch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.input, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: controlHeights.touch, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  text: { flex: 1, gap: 2 },
  disabled: { opacity: 0.5 },
  group: { gap: spacing[1] },
  box: { width: 20, height: 20, marginTop: 1, borderWidth: 1.5, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  radio: { borderRadius: radius.full },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  switchRow: { minHeight: controlHeights.touch, flexDirection: "row", alignItems: "center", gap: spacing[4] },
});
