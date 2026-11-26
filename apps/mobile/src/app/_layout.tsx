import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
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

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

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
