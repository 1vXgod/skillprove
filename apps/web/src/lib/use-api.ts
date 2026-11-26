"use client";

import { createApiClient, errorMessageKey, fieldErrorsOf, validationMessageKey, type ApiClient } from "@skillprove/api-client";
import type { Translate } from "@skillprove/shared/i18n";
import { useMemo } from "react";
import { apiBaseUrl } from "./api";
import { useI18n } from "./i18n";
import { useGetToken } from "./token-context";

/** The API client for the signed-in user, asking for content in the current language. */
export function useApiClient(): ApiClient {
  const getToken = useGetToken();
  const { locale } = useI18n();
  return useMemo(() => createApiClient({ baseUrl: apiBaseUrl, getToken, locale }), [getToken, locale]);
}

/** Query keys, so every screen refreshes the same cached data. */
export const queryKeys = {
  me: ["me"] as const,
  assessments: (companyId: string) => ["assessments", companyId] as const,
  assessment: (id: string, locale: string) => ["assessment", id, locale] as const,
  assessmentPreview: (id: string) => ["assessment-preview", id] as const,
  versions: (id: string) => ["assessment-versions", id] as const,
  job: (id: string) => ["ai-job", id] as const,
  ownProfile: ["own-profile"] as const,
  passport: (locale: string) => ["skill-passport", locale] as const,
  preview: (locale: string) => ["profile-preview", locale] as const,
  skillSearch: (locale: string, q: string) => ["skill-search", locale, q] as const,
  takeable: (locale: string) => ["takeable-assessments", locale] as const,
  attempt: (id: string) => ["attempt", id] as const,
};

export { fieldErrorsOf };

/** A field's validation key as translated text, or undefined. Unknown keys are not shown raw. */
export function fieldMessage(t: Translate, key: string | undefined): string | undefined {
  const messageKey = validationMessageKey(key);
  return messageKey ? t(messageKey) : undefined;
}

/** A form-level message for a failed request. Field errors are shown on their fields instead. */
export function errorMessage(t: Translate, error: unknown): string {
  return t(errorMessageKey(error));
}

/** "a, b , c" ⇄ ["a", "b", "c"], for list fields typed as text. */
export const splitList = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean);
export const joinList = (items: readonly string[]) => items.join(", ");
