/**
 * Whether the phone can reach the internet, from expo-network's state. Either value may be
 * unknown (null or missing) while the system is still checking; unknown counts as online, so a
 * slow check never blocks requests. Only a definite "no" counts as offline.
 */
export function isOnline(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}
