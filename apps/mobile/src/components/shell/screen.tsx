import { breakpoints, controlHeights, layout, spacing } from "@skillprove/shared/design";
import { LOCALES } from "@skillprove/shared/i18n";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePreferences } from "../../theme/preferences-provider";
import { AppText, IconButton, Logo } from "../ui";

function AppHeader({ showBack, settings }: { showBack: boolean; settings: boolean }) {
  const { t, locale, setLocale, colors } = usePreferences();
  const nextLocale = LOCALES.find((l) => l !== locale) ?? locale;
  return (
    <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {showBack ? (
        <IconButton label={t("shell.back")} icon="arrow-left" onPress={() => router.back()} />
      ) : (
        <View style={styles.brand}>
          <Logo size="sm" />
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("language.label")}: ${t(`language.${locale}`)}`}
          accessibilityHint={t(`language.${nextLocale}`)}
          onPress={() => setLocale(nextLocale)}
          style={styles.locale}
        >
          <AppText variant="label" tone="mutedForeground">
            {locale.toUpperCase()}
          </AppText>
        </Pressable>
        {settings && <IconButton label={t("nav.account")} icon="settings" onPress={() => router.push("/settings")} />}
      </View>
    </View>
  );
}

/**
 * Every screen's frame: safe areas, the app header, keyboard avoidance and a scrolling body
 * capped at a readable width on tablets. Tab screens show the logo; pushed screens a back button.
 * `settings` adds the gear that opens Settings (on the Profile tab). `footer` stays fixed below
 * the scrolling body, above the keyboard, such as a save bar.
 */
export function Screen({ children, showBack = false, settings = false, footer }: { children: ReactNode; showBack?: boolean; settings?: boolean; footer?: ReactNode }) {
  const { colors } = usePreferences();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.flex, { backgroundColor: colors.surface }]}>
      <AppHeader showBack={showBack} settings={settings} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={["bottom"]} style={styles.column}>
            {children}
          </SafeAreaView>
        </ScrollView>
        {footer && (
          <SafeAreaView edges={["bottom"]} style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.column}>{footer}</View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: layout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[2] },
  actions: { flexDirection: "row", alignItems: "center" },
  locale: { minWidth: controlHeights.touch, height: controlHeights.touch, alignItems: "center", justifyContent: "center" },
  body: { flexGrow: 1, paddingHorizontal: spacing[5], paddingVertical: spacing[6] },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[3] },
  column: { width: "100%", maxWidth: breakpoints.sm, alignSelf: "center", gap: spacing[4] },
});
