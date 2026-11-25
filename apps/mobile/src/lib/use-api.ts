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
  me: ["me"] as const,
  assessments: (companyId: string) => ["assessments", companyId] as const,
  assessment: (id: string, locale: string) => ["assessment", id, locale] as const,
  versions: (id: string) => ["assessment-versions", id] as const,
  job: (id: string) => ["ai-job", id] as const,
  ownProfile: ["own-profile"] as const,
  passport: (locale: string) => ["skill-passport", locale] as const,
  preview: (locale: string) => ["profile-preview", locale] as const,
  skillSearch: (locale: string, q: string) => ["skill-search", locale, q] as const,
  takeable: (locale: string) => ["takeable-assessments", locale] as const,
  attempt: (id: string) => ["attempt", id] as const,
};

export function fieldMessage(t: Translate, code: string | undefined): string | undefined {
  const key = validationMessageKey(code);
  return key ? t(key) : undefined;
}

export const errorMessage = (t: Translate, error: unknown) => t(errorMessageKey(error));
export { fieldErrorsOf };

export { joinList, orNull, splitList, yearsValue } from "./form-values";
