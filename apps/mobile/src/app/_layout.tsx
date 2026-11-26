import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import PlusJakartaSans_400Regular from "../../assets/fonts/PlusJakartaSans_400Regular.ttf";
import PlusJakartaSans_500Medium from "../../assets/fonts/PlusJakartaSans_500Medium.ttf";
import PlusJakartaSans_600SemiBold from "../../assets/fonts/PlusJakartaSans_600SemiBold.ttf";
import PlusJakartaSans_700Bold from "../../assets/fonts/PlusJakartaSans_700Bold.ttf";
import DMSerifDisplay_400Regular from "../../assets/fonts/DMSerifDisplay_400Regular.ttf";
import DMSerifDisplay_400Regular_Italic from "../../assets/fonts/DMSerifDisplay_400Regular_Italic.ttf";
import { clerkPublishableKey } from "../lib/auth-config";
import "../lib/online-manager";
import { PreferencesProvider, useTheme } from "../theme/preferences-provider";

function AuthProvider({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) return children;
  // tokenCache keeps the session in expo-secure-store, not ordinary storage.
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

function ThemedStack() {
  const { colors, theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}

/** The bundled fonts (assets/fonts), registered under the names the type tokens use. */
const FONTS = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
};

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // Local files load in a few milliseconds; the splash screen stays up until then. If loading
  // fails, the app still opens with the system font rather than staying blank.
  const [fontsLoaded, fontError] = useFonts(FONTS);
  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <ThemedStack />
        </PreferencesProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
