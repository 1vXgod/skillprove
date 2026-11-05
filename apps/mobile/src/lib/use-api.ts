import { useAuth } from "@clerk/expo";
import { createApiClient, errorMessageKey, fieldErrorsOf, validationMessageKey, type ApiClient } from "@skillprove/api-client";
import type { Translate } from "@skillprove/shared/i18n";
import { useMemo } from "react";
import { useI18n } from "../theme/preferences-provider";
import { apiBaseUrl } from "./api";

/** The API client for the signed-in user. Must render inside ClerkProvider (see SignedInGate). */
export function useApiClient(): ApiClient {
  const { getToken } = useAuth();
  const { locale } = useI18n();
  return useMemo(() => createApiClient({ baseUrl: apiBaseUrl ?? "", getToken, locale }), [getToken, locale]);
}

export const queryKeys = {
  ownProfile: ["own-profile"] as const,
  passport: (locale: string) => ["skill-passport", locale] as const,
  preview: (locale: string) => ["profile-preview", locale] as const,
  skillSearch: (locale: string, q: string) => ["skill-search", locale, q] as const,
};

export function fieldMessage(t: Translate, code: string | undefined): string | undefined {
  const key = validationMessageKey(code);
  return key ? t(key) : undefined;
}

export const errorMessage = (t: Translate, error: unknown) => t(errorMessageKey(error));
export { fieldErrorsOf };

export { joinList, orNull, splitList, yearsValue } from "./form-values";
