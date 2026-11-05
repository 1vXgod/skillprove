import { createApiClient } from "@skillprove/api-client";
import Constants from "expo-constants";
import { resolveApiBaseUrl } from "./api-url";

export const apiBaseUrl = resolveApiBaseUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  expoHostUri: Constants.expoConfig?.hostUri,
  isDevelopment: __DEV__,
});

// With no URL the requests fail, and the screen shows the error state.
export const api = createApiClient({ baseUrl: apiBaseUrl ?? "" });
