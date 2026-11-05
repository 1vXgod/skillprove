"use client";

import { ASSESSMENT_LIMITS } from "@skillprove/shared";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { Alert, Badge, Button, Input, Skeleton } from "../ui";

export interface PickedSkill {
  id: string;
  name: string;
}

/** Search the skill taxonomy and pick up to the maximum number of skills. */
export function SkillPicker({ value, onChange, error }: { value: PickedSkill[]; onChange: (skills: PickedSkill[]) => void; error?: string }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const results = useQuery({
    queryKey: queryKeys.skillSearch(locale, search),
    queryFn: () => client.searchSkills({ q: search, limit: 12 }),
    retry: false,
  });
  const chosen = new Set(value.map((s) => s.id));
  const options = (results.data?.items ?? []).filter((s) => !chosen.has(s.id));
  const full = value.length >= ASSESSMENT_LIMITS.maxSkills;

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body-small text-muted-foreground">{t("assessments.wizard.skillsHelp", { max: ASSESSMENT_LIMITS.maxSkills })}</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div aria-label={t("assessments.wizard.skillSelected")} className="flex flex-wrap gap-2" data-testid="selected-skills">
        {value.map((skill) => (
          <Badge key={skill.id} tone="info" className="h-8 gap-1 pl-3 pr-1">
            {skill.name}
            <button
              type="button"
              aria-label={t("assessments.wizard.skillRemove", { name: skill.name })}
              onClick={() => onChange(value.filter((s) => s.id !== skill.id))}
              className="flex size-6 items-center justify-center rounded-full hover:bg-foreground/10"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <Input label={t("assessments.wizard.skillSearch")} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" disabled={full} />
      {results.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : results.isError ? (
        <Alert tone="error">{errorMessage(t, results.error)}</Alert>
      ) : options.length === 0 ? (
        <p className="type-body-small text-muted-foreground">{t("assessments.wizard.skillSearchEmpty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {options.map((skill) => (
            <li key={skill.id}>
              <Button type="button" size="sm" variant="outline" disabled={full} onClick={() => onChange([...value, { id: skill.id, name: skill.name }])}>
                + {skill.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
