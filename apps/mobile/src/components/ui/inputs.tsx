import { Feather } from "@expo/vector-icons";
import { controlHeights, iconSizes, radius, spacing } from "@skillprove/shared/design";
import { useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n, useTheme } from "../../theme/preferences-provider";
import { textStyle } from "../../theme/styles";
import { AppText } from "./text";

interface FieldProps {
  label: string;
  helperText?: string;
  error?: string;
  labelHint?: string;
}

function FieldFrame({ label, labelHint, helperText, error, children }: FieldProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        {labelHint && (
          <AppText variant="caption" tone="mutedForeground">
            {labelHint}
          </AppText>
        )}
      </View>
      {children}
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={14} color={colors.destructive} style={styles.messageIcon} />
          <AppText variant="bodySmall" tone="destructive" style={styles.flex}>
            {error}
          </AppText>
        </View>
      ) : (
        helperText && (
          <AppText variant="bodySmall" tone="mutedForeground">
            {helperText}
          </AppText>
        )
      )}
    </View>
  );
}

function useControlStyle(focused: boolean, error?: string, disabled?: boolean) {
  const { colors } = useTheme();
  return {
    borderColor: error ? colors.destructive : focused ? colors.ring : colors.input,
    borderWidth: focused ? 2 : 1,
    backgroundColor: disabled ? colors.muted : colors.surface,
    color: disabled ? colors.mutedForeground : colors.foreground,
  };
}

type InputProps = FieldProps & Omit<TextInputProps, "editable"> & { disabled?: boolean };

/** A labelled text field. The label, hint and error are part of its accessible description. */
export function Input({ label, labelHint, helperText, error, disabled, onFocus, onBlur, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const control = useControlStyle(focused, error, disabled);
  return (
    <FieldFrame {...{ label, labelHint, helperText, error }}>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? helperText}
        accessibilityState={{ disabled }}
        editable={!disabled}
        placeholderTextColor={colors.mutedForeground}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.control, textStyle("body"), control, style]}
        {...props}
      />
    </FieldFrame>
  );
}

export function Textarea(props: InputProps) {
  return <Input multiline textAlignVertical="top" numberOfLines={4} {...props} style={styles.textarea} />;
}

export function PasswordInput({ label, labelHint, helperText, error, disabled, ...props }: Omit<InputProps, "secureTextEntry">) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const control = useControlStyle(focused, error, disabled);
  return (
    <FieldFrame {...{ label, labelHint, helperText, error }}>
      <View style={[styles.control, styles.row, control]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helperText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.flex, textStyle("body"), { color: control.color }]}
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? t("components.hidePassword") : t("components.showPassword")}
          accessibilityState={{ checked: visible }}
          onPress={() => setVisible((v) => !v)}
          disabled={disabled}
          hitSlop={8}
          style={styles.toggle}
        >
          <Feather name={visible ? "eye-off" : "eye"} size={iconSizes.md} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </FieldFrame>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends FieldProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Opens a full-screen list: large targets, scrolls for long lists, and works the same on both platforms. */
export function Select({ label, labelHint, helperText, error, options, value, onChange, placeholder, disabled }: SelectProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const control = useControlStyle(open, error, disabled);
  const selected = options.find((option) => option.value === value);

  return (
    <FieldFrame {...{ label, labelHint, helperText, error }}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder ?? t("components.selectPlaceholder") }}
        accessibilityState={{ expanded: open, disabled }}
        accessibilityHint={error ?? helperText}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, styles.row, control]}
      >
        <AppText tone={selected ? "foreground" : "mutedForeground"} style={styles.flex} numberOfLines={1}>
          {selected?.label ?? placeholder ?? t("components.selectPlaceholder")}
        </AppText>
        <Feather name="chevron-down" size={iconSizes.md} color={colors.mutedForeground} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={[styles.flex, { backgroundColor: colors.surface }]} edges={["top", "bottom"]}>
          <View style={[styles.sheetHeader, { borderColor: colors.border }]}>
            <AppText variant="h4" style={styles.flex} accessibilityRole="header">
              {label}
            </AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setOpen(false)} style={styles.toggle} hitSlop={8}>
              <Feather name="x" size={iconSizes.lg} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(option) => option.value}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, checked: isSelected }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, { backgroundColor: pressed ? colors.muted : "transparent", borderColor: colors.border }]}
                >
                  <AppText style={styles.flex}>{item.label}</AppText>
                  {isSelected && <Feather name="check" size={iconSizes.md} color={colors.accent} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing[1.5] },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[2] },
  messageRow: { flexDirection: "row", gap: spacing[1.5] },
  messageIcon: { marginTop: 3 },
  control: {
    minHeight: controlHeights.touch,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  textarea: { minHeight: 112 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  toggle: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
