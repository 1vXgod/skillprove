import { useAuth } from "@clerk/expo";
import { radius, spacing } from "@skillprove/shared/design";
import { Redirect, type Href } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountSection } from "../components/account-panel";
import { AppText, GlowBackground, GradientText, LightMark, Logo } from "../components/ui";
import { clerkPublishableKey } from "../lib/auth-config";
import { usePreferences } from "../theme/preferences-provider";

// The Home tab (app/(tabs)/index.tsx) is "/" at runtime; the typed-route generator lists it as
// "/index", so the root path is declared here once.
const HOME = "/" as Href;

/**
 * The signed-out start, like the web landing hero: the logo, the promise, and sign up or sign in
 * (Clerk's hosted pages). Once signed in, the tabs open.
 */
export default function WelcomeScreen() {
  if (clerkPublishableKey) return <SignedOutOnly />;
  return <Welcome />;
}

function SignedOutOnly() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect href={HOME} />;
  return <Welcome />;
}

function Welcome() {
  const { t, colors } = usePreferences();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <ScrollView contentContainerStyle={styles.body}>
        <Logo size="md" />
        <View style={styles.hero}>
          <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="caption" tone="mutedForeground">
              {t("landing.eyebrow")}
            </AppText>
          </View>
          <AppText variant="hero" accessibilityRole="header">
            {t("landing.heroTitleLead")}
          </AppText>
          <GradientText variant="hero">{t("landing.heroTitleAccent")}</GradientText>
          <AppText variant="bodyLarge" tone="mutedForeground">
            {t("landing.heroBody")}
          </AppText>
        </View>
        <View style={styles.mark}>
          <LightMark size={180} />
        </View>
        <View style={styles.actions}>
          <AccountSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: "hidden" },
  body: { flexGrow: 1, paddingHorizontal: spacing[5], paddingVertical: spacing[6], gap: spacing[6] },
  hero: { gap: spacing[3] },
  pill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  mark: { alignItems: "center" },
  actions: { gap: spacing[2], marginTop: "auto" },
});
