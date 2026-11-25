import { THEME_PREFERENCES } from "@skillprove/shared/design";
import { LOCALES } from "@skillprove/shared/i18n";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AccountSection } from "../components/account-panel";
import { Screen } from "../components/shell/screen";
import { AppText, Button, Card, RadioGroup } from "../components/ui";
import { usePreferences } from "../theme/preferences-provider";
import { spacing } from "@skillprove/shared/design";

/** Language, theme and account: the app's only settings so far. */
export default function SettingsScreen() {
  const { t, locale, setLocale, preference, setPreference } = usePreferences();
  return (
    <Screen showBack>
      <AppText variant="h1" accessibilityRole="header">
        {t("shell.preferences")}
      </AppText>

      <Card>
        <RadioGroup
          label={t("language.label")}
          value={locale}
          onChange={setLocale}
          options={LOCALES.map((option) => ({ value: option, label: t(`language.${option}`) }))}
        />
      </Card>

      <Card>
        <RadioGroup
          label={t("theme.label")}
          value={preference}
          onChange={setPreference}
          options={THEME_PREFERENCES.map((option) => ({ value: option, label: t(`theme.${option}`) }))}
        />
      </Card>

      <Card>
        <AppText variant="h4" accessibilityRole="header">
          {t("shell.account")}
        </AppText>
        <View style={styles.account}>
          <AccountSection />
        </View>
      </Card>

      {__DEV__ && <Button label={t("nav.designSystem")} variant="link" icon="layout" onPress={() => router.push("/design-system")} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { gap: spacing[2] },
});
