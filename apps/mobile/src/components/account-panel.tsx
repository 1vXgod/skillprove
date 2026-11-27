import { useAuth } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { createApiClient } from "@skillprove/api-client";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { apiBaseUrl } from "../lib/api";
import { clerkPublishableKey } from "../lib/auth-config";
import { spacing } from "@skillprove/shared/design";
import { useI18n } from "../theme/preferences-provider";
import { Alert, AppText, Button, Spinner } from "./ui";

WebBrowser.maybeCompleteAuthSession();

export function AccountSection() {
  const { t } = useI18n();
  if (clerkPublishableKey) return <AccountPanel />;
  return <AppText tone="mutedForeground">{t("auth.notConfiguredMobile")}</AppText>;
}

/**
 * Sign-in, sign-up, email verification, password recovery and social sign-in all happen on
 * Clerk's hosted pages, which also works in Expo Go. The session returns to the app.
 */
function AccountPanel() {
  const { t } = useI18n();
  const { isLoaded, isSignedIn, getToken, signOut, userId } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [authFailed, setAuthFailed] = useState(false);

  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl ?? "", getToken }), [getToken]);
  const account = useQuery({
    queryKey: ["current-user", userId],
    queryFn: client.getCurrentUser,
    enabled: Boolean(isSignedIn),
    retry: false,
  });

  async function openAuth(mode: "sign-in" | "sign-up") {
    setAuthFailed(false);
    try {
      await startHostedAuth({ mode });
    } catch {
      setAuthFailed(true);
    }
  }

  if (!isLoaded) return <Spinner />;

  if (!isSignedIn) {
    return (
      <View style={styles.group}>
        {authFailed && <Alert tone="error" message={t("auth.signInFailed")} />}
        <Button label={t("auth.createAccount")} variant="glow" size="lg" onPress={() => void openAuth("sign-up")} fullWidth />
        <Button label={t("auth.signIn")} variant="outline" size="lg" onPress={() => void openAuth("sign-in")} fullWidth />
      </View>
    );
  }

  return (
    <View style={styles.group}>
      {account.isPending && <Spinner />}
      {account.isError && <Alert tone="error" message={t("account.loadFailed")} />}
      {account.data && (
        <AppText>{t("account.signedInAs", { email: account.data.email ?? t("account.unverifiedEmail") })}</AppText>
      )}
      {/* Navigation lives in the tab bar; here only the account itself. */}
      <Button label={t("auth.signOut")} variant="outline" icon="log-out" onPress={() => void signOut()} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[2] },
});
