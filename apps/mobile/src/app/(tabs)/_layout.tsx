import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { fontFamilies } from "@skillprove/shared/design";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { StyleSheet, View } from "react-native";
import { Spinner } from "../../components/ui";
import { clerkPublishableKey } from "../../lib/auth-config";
import { tabsFor } from "../../lib/tabs";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { usePreferences } from "../../theme/preferences-provider";
import { textStyle } from "../../theme/styles";

/**
 * The signed-in app: a bottom tab bar over the main screens. Detail screens (an attempt, profile
 * editing, settings) are pushed on top from the root stack, so the tab bar is out of the way there.
 * Signed out, or without sign-in configured, the welcome screen shows instead.
 */
export default function TabsLayout() {
  if (!clerkPublishableKey) return <Redirect href="/welcome" />;
  return <SignedInTabs />;
}

function SignedInTabs() {
  const { colors } = usePreferences();
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Spinner />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/welcome" />;
  return <TabBar />;
}

function TabBar() {
  const { t, colors } = usePreferences();
  const client = useApiClient();
  // Company membership decides only whether the Company tab shows; the API checks it on every request.
  const me = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });
  const tabs = tabsFor({ isCompanyMember: (me.data?.companies.length ?? 0) > 0 });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { ...textStyle("caption"), fontFamily: fontFamilies.native.sans[500] },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            href: tab.visible ? undefined : null,
            tabBarIcon: ({ color, size }) => <Feather name={tab.icon} color={color as string} size={size - 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
