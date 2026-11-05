import { Feather } from "@expo/vector-icons";
import { controlHeights, iconSizes, radius, spacing } from "@skillprove/shared/design";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal as NativeModal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { useI18n, useTheme } from "../../theme/preferences-provider";
import { shadowStyle, textStyle } from "../../theme/styles";
import { AppText } from "./text";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** For confirmations: no backdrop dismissal, so the choice is explicit. */
  dismissible?: boolean;
}

/**
 * A centred dialog. Screen readers stay inside it (accessibilityViewIsModal), Android's back
 * button closes it, and it lifts above the keyboard. Fades only when motion is allowed.
 */
export function Modal({ visible, onClose, title, description, children, footer, dismissible = true }: ModalProps) {
  const { t } = useI18n();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <NativeModal visible={visible} transparent animationType={reduced ? "none" : "fade"} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable
          accessible={false}
          onPress={dismissible ? onClose : undefined}
          style={[styles.backdrop, { backgroundColor: colors.overlay, paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[4] }]}
        >
          <Pressable
            accessible={false}
            // Stops a press inside the panel from reaching the backdrop.
            onPress={() => undefined}
            accessibilityViewIsModal
            style={[styles.panel, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, shadowStyle("lg", theme)]}
          >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View style={styles.flex}>
                  <AppText variant="h3" accessibilityRole="header">
                    {title}
                  </AppText>
                  {description && (
                    <AppText variant="body" tone="mutedForeground">
                      {description}
                    </AppText>
                  )}
                </View>
                {dismissible && (
                  <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} style={styles.close}>
                    <Feather name="x" size={iconSizes.md} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
              {children}
              {footer && <View style={styles.footer}>{footer}</View>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

/** A segmented tab bar. Each tab reports its selected state to screen readers. */
export function Tabs<T extends string>({ items, value, onChange, label }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.tabs, { borderColor: colors.border }]}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.value)}
            style={[styles.tab, { borderColor: selected ? colors.primary : "transparent" }]}
          >
            <AppText style={[textStyle("label"), { color: selected ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: "center", paddingHorizontal: spacing[4] },
  panel: { maxHeight: "100%", width: "100%", maxWidth: 480, alignSelf: "center", borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  content: { padding: spacing[6], gap: spacing[4] },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  close: { width: controlHeights.touch, height: controlHeights.touch, alignItems: "center", justifyContent: "center", marginTop: -spacing[2], marginRight: -spacing[3] },
  footer: { gap: spacing[2], paddingTop: spacing[2] },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, minHeight: controlHeights.touch, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, marginBottom: -1, paddingHorizontal: spacing[2] },
});
