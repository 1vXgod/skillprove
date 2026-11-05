import * as SecureStore from "expo-secure-store";

/**
 * Stores small, non-secret preferences (theme, language) with expo-secure-store, which is
 * already installed for Clerk. A failed read or write only loses the preference, never crashes.
 */
export async function readPreference(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // The choice still applies for this session.
  }
}
