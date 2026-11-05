"use client";

import {
  ASSESSMENT_DIFFICULTIES,
  ASSESSMENT_LANGUAGES,
  ASSESSMENT_TYPES,
  QUESTION_KINDS,
} from "@skillprove/shared";
import { COMPANY_ROLE_SETS, hasCompanyRole, type CompanyRole } from "@skillprove/permissions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { queryKeys, useApiClient } from "../../lib/use-api";
import type { SelectOption } from "../ui";

/**
 * The signed-in user's company for assessment screens. This only decides which buttons to show:
 * the API checks membership and role again on every request.
 */
export function useCompany() {
  const client = useApiClient();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });
  const [chosen, setChosen] = useState<string | null>(null);
  const companies = me.data?.companies ?? [];
  const current = companies.find((c) => c.companyId === chosen) ?? companies[0] ?? null;
  const role = (current?.role ?? null) as CompanyRole | null;
  return {
    query: me,
    companies,
    companyId: current?.companyId ?? null,
    role,
    choose: setChosen,
    canAuthor: role !== null && hasCompanyRole(role, COMPANY_ROLE_SETS.authorAssessments),
    canDelete: role !== null && hasCompanyRole(role, COMPANY_ROLE_SETS.deleteAssessments),
  };
}

/** Translated option lists, so no visible label is hardcoded. */
export function useOptions() {
  const { t } = useI18n();
  return {
    difficulty: ASSESSMENT_DIFFICULTIES.map((value): SelectOption => ({ value, label: t(`assessments.difficulty.${value}`) })),
    type: ASSESSMENT_TYPES.map((value): SelectOption => ({ value, label: t(`assessments.type.${value}`) })),
    language: ASSESSMENT_LANGUAGES.map((value): SelectOption => ({ value, label: t(`assessments.language.${value}`) })),
    kind: QUESTION_KINDS.map((value): SelectOption => ({ value, label: t(`assessments.kind.${value}`) })),
  };
}

export const statusTone = { DRAFT: "warning", PUBLISHED: "success", ARCHIVED: "neutral" } as const;

/** One item per line, as the question forms edit lists. */
export const splitLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
export const joinLines = (items: readonly string[] | undefined) => (items ?? []).join("\n");

const FAILURE_CODES = ["provider_timeout", "provider_unavailable", "provider_rate_limited", "provider_blocked", "provider_misconfigured", "invalid_output", "timeout", "internal", "invalid_job"] as const;

/** The message key for a job's stable error code. Unknown codes read as a generic failure, never raw. */
export function failureReasonKey(code: string | null) {
  const known = FAILURE_CODES.find((c) => c === code) ?? "internal";
  return `assessments.generation.reason.${known}` as const;
}
