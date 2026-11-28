import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { clerkAccountPortalUrl } from "@skillprove/shared";
import { controlHeights, radius, spacing, THEME_PREFERENCES, type ThemePreference } from "@skillprove/shared/design";
import { formatNumber, LOCALES } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AccountSection } from "../components/account-panel";
import { Screen } from "../components/shell/screen";
import { Alert, AppText, Avatar, Button, Card, Chip, GradientPanel, IconTile, RadioGroup, Separator, Skeleton, type IconName } from "../components/ui";
import { clerkPublishableKey } from "../lib/auth-config";
import { queryKeys, useApiClient } from "../lib/use-api";
import { useI18n, usePreferences, useTheme } from "../theme/preferences-provider";

const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ANONYMIZED"] as const;
const THEME_ICONS: Record<ThemePreference, IconName> = { light: "sun", dark: "moon", system: "monitor" };
const portalUrl = clerkAccountPortalUrl(clerkPublishableKey);

/**
 * Account and settings. Everything shown is real: the account from `GET /me`, preferences saved
 * on this device, and password changes on the sign-in provider's hosted page. There is no
 * delete-account endpoint yet, so the danger zone points to deleting the profile instead.
 */
export default function SettingsScreen() {
  const { t } = useI18n();
  return (
    <Screen showBack>
      <AppText variant="h1" accessibilityRole="header">
        {t("account.settingsTitle")}
      </AppText>
      <AppText tone="mutedForeground">{t("account.settingsDescription")}</AppText>
      {clerkPublishableKey ? <AccountCards /> : <AppText tone="mutedForeground">{t("auth.notConfiguredMobile")}</AppText>}
      <Preferences />
      {__DEV__ && <Button label={t("nav.designSystem")} variant="link" icon="layout" onPress={() => router.push("/design-system")} />}
    </Screen>
  );
}

function AccountCards() {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Skeleton height={160} />;
  if (!isSignedIn) {
    return (
      <Card>
        <Heading icon="user" title={t("account.signedOutTitle")} />
        <AppText tone="mutedForeground">{t("account.signedOutBody")}</AppText>
        <AccountSection />
      </Card>
    );
  }
  return <SignedInAccount />;
}

function SignedInAccount() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { user } = useUser();
  const client = useApiClient();
  const account = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });

  const email = account.data?.email ?? null;
  const knownStatus = account.data ? USER_STATUSES.find((s) => s === account.data.status) : undefined;
  const statusLabel = account.data ? (knownStatus ? t(`account.userStatus.${knownStatus}`) : account.data.status) : "";
  const name = user?.fullName || user?.username || email || t("account.unverifiedEmail");

  return (
    <>
      <GradientPanel>
        <View style={styles.hero}>
          <View style={styles.identity}>
            <Avatar name={name} uri={user?.hasImage ? user.imageUrl : null} size="lg" />
            <View style={styles.flex}>
              <AppText variant="h3" numberOfLines={1} style={{ color: colors.sidebarForeground }}>
                {name}
              </AppText>
              {email && (
                <AppText variant="bodySmall" numberOfLines={1} style={{ color: colors.sidebarMuted }}>
                  {email}
                </AppText>
              )}
            </View>
          </View>
          {account.data && (
            <View style={styles.wrap}>
              <Chip inverse icon="shield" label={statusLabel} />
              <Chip inverse icon="mail" label={email ? t("account.emailVerified") : t("account.emailNotVerified")} />
            </View>
          )}
        </View>
      </GradientPanel>

      {account.isError && <Alert tone="error" message={t("account.loadFailed")} />}

      <Card>
        <Heading icon="user" title={t("account.title")} />
        {account.isPending ? (
          <Skeleton height={96} />
        ) : account.data ? (
          <View>
            <InfoRow icon="mail" label={t("account.email")} value={email ?? t("account.emailNotVerified")} />
            <Separator />
            <InfoRow icon="shield" label={t("account.status")} value={statusLabel} />
            <Separator />
            <InfoRow icon="briefcase" label={t("account.companyMemberships")} value={formatNumber(locale, account.data.companies.length)} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Heading icon="lock" title={t("account.security")} />
        {portalUrl && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("account.manageSecurity")}
            accessibilityHint={t("account.manageSecurityHelp")}
            onPress={() => void WebBrowser.openBrowserAsync(portalUrl)}
            style={({ pressed }) => [styles.linkRow, { borderColor: colors.border }, pressed && { backgroundColor: colors.muted }]}
          >
            <Feather name="external-link" size={18} color={colors.mutedForeground} />
            <View style={styles.flex}>
              <AppText variant="label">{t("account.manageSecurity")}</AppText>
              <AppText variant="bodySmall" tone="mutedForeground">
                {t("account.manageSecurityHelp")}
              </AppText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </Card>

      <Card>
        <Heading icon="log-out" title={t("account.session")} />
        <Button label={t("auth.signOut")} variant="outline" icon="log-out" onPress={() => void signOut()} fullWidth />
      </Card>

      <Card style={{ borderColor: colors.destructive }}>
        <AppText variant="h4" accessibilityRole="header" style={{ color: colors.destructive }}>
          {t("profile.dangerZone")}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("account.deleteHint")}
        </AppText>
        <Button label={t("account.goToProfile")} variant="outline" size="sm" onPress={() => router.push("/profile")} />
      </Card>
    </>
  );
}

function Preferences() {
  const { t, locale, setLocale, preference, setPreference } = usePreferences();
  return (
    <Card>
      <View style={styles.headingBlock}>
        <Heading icon="sliders" title={t("account.preferences")} />
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("account.preferencesHelp")}
        </AppText>
      </View>
      <View style={styles.group}>
        <AppText variant="label">{t("language.label")}</AppText>
        <RadioGroup card label={t("language.label")} value={locale} onChange={setLocale} options={LOCALES.map((option) => ({ value: option, label: t(`language.${option}`), icon: "globe" as const }))} />
      </View>
      <View style={styles.group}>
        <AppText variant="label">{t("theme.label")}</AppText>
        <RadioGroup card label={t("theme.label")} value={preference} onChange={setPreference} options={THEME_PREFERENCES.map((option) => ({ value: option, label: t(`theme.${option}`), icon: THEME_ICONS[option] }))} />
      </View>
    </Card>
  );
}

function Heading({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.heading}>
      <IconTile icon={icon} size="sm" />
      <AppText variant="h4" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${String(value)}`}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodySmall" tone="mutedForeground" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: spacing[4], padding: spacing[5] },
  identity: { flexDirection: "row", gap: spacing[4], alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  headingBlock: { gap: spacing[1] },
  group: { gap: spacing[2] },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch, paddingVertical: spacing[2] },
  value: { maxWidth: "55%", textAlign: "right" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3], borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg },
});
