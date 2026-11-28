import { Feather } from "@expo/vector-icons";
import { controlHeights, radius, spacing } from "@skillprove/shared/design";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Switch as NativeSwitch, View } from "react-native";
import { useTheme } from "../../theme/preferences-provider";
import type { IconName } from "./button";
import { AppText } from "./text";

interface ChoiceProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** A large bordered row, for answers. */
  card?: boolean;
  /** A decorative icon before the text. */
  icon?: IconName;
}

/** The bordered look of a card row, highlighted when chosen. */
function cardStyle(colors: ReturnType<typeof useTheme>["colors"], selected: boolean) {
  return [styles.card, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.surface }];
}

function ChoiceRow({ label, description, control, disabled, icon }: { label: string; description?: string; control: ReactNode; disabled?: boolean; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {control}
      {icon && <Feather name={icon} size={18} color={colors.primary} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />}
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
export function Checkbox({ label, description, checked, onChange, disabled, card }: ChoiceProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.target, card && cardStyle(colors, checked)]}
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
  options: { value: T; label: string; description?: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Large bordered rows; the label is read out but not shown. */
  card?: boolean;
}

export function RadioGroup<T extends string>({ label, options, value, onChange, disabled, card }: RadioGroupProps<T>) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={card ? styles.cardGroup : styles.group}>
      {!card && <AppText variant="label">{label}</AppText>}
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
            style={[styles.target, card && cardStyle(colors, selected)]}
          >
            <ChoiceRow
              label={option.label}
              description={option.description}
              icon={option.icon}
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
export function Switch({ label, description, checked, onChange, disabled, icon, leading }: ChoiceProps & { leading?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchRow, disabled && styles.disabled]}>
      {icon && <Feather name={icon} size={18} color={colors.mutedForeground} accessibilityElementsHidden importantForAccessibility="no" />}
      {leading && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {leading}
        </View>
      )}
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
  cardGroup: { gap: spacing[3] },
  card: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  box: { width: 20, height: 20, marginTop: 1, borderWidth: 1.5, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  radio: { borderRadius: radius.full },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  switchRow: { minHeight: controlHeights.touch, flexDirection: "row", alignItems: "center", gap: spacing[3] },
  icon: { marginTop: 1 },
});

/** A single choice shown as a row of pills, for filters. It scrolls sideways when it overflows. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={label} contentContainerStyle={chipStyles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[chipStyles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface }]}
          >
            <AppText variant="label" style={{ color: selected ? colors.primaryForeground : colors.mutedForeground }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const chipStyles = StyleSheet.create({
  row: { gap: spacing[2] },
  chip: { minHeight: controlHeights.touch, justifyContent: "center", paddingHorizontal: spacing[4], borderWidth: 1, borderRadius: radius.full },
});
