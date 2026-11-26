import { onlineManager } from "@tanstack/react-query";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { isOnline } from "./connectivity";

/*
 * TanStack Query learns about connectivity from the browser's online/offline events, which
 * React Native does not have, so on the phone it always assumed a connection: offline requests
 * hung on loading. With this, queries pause while offline (screens say so) and resume by
 * themselves when the connection returns.
 */
onlineManager.setEventListener((setOnline) => {
  getNetworkStateAsync()
    .then((state) => setOnline(isOnline(state)))
    .catch(() => undefined);
  const subscription = addNetworkStateListener((state) => setOnline(isOnline(state)));
  return () => subscription.remove();
});
