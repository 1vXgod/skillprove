"use client";

import { SELF_REPORTED_LEVELS, verifiedSkillLevel } from "@skillprove/shared";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import {
  selfReportedSkillInputSchema,
  selfReportedSkillUpdateSchema,
  type SelfReportedSkill,
  type SkillPassport as Passport,
  type VerifiedSkillWithEvidence,
} from "@skillprove/validation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ClipboardIcon, InboxIcon, SuccessIcon } from "../icons";
import { FormDialog, useDialog } from "../profile/form-dialog";
import { Alert, AlertDialog, Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Select, Skeleton } from "../ui";

export function SkillPassportView() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });

  if (passport.isPending) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (passport.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, passport.error)}
          <Button size="sm" variant="outline" onClick={() => void passport.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  return <PassportSections passport={passport.data} />;
}

function PassportSections({ passport }: { passport: Passport }) {
  const { t, locale } = useI18n();
  const verifiedIds = new Set(passport.verified.map((v) => v.skill.id));
  const date = (iso: string) => formatDate(locale, new Date(iso));

  return (
    <div className="flex flex-col gap-6">
      <Card data-testid="verified-skills">
        <CardHeader title={t("passport.verifiedTitle")} />
        <CardContent className="pt-4">
          {passport.verified.length === 0 ? (
            <EmptyState icon={<SuccessIcon size={20} />} title={t("passport.verifiedEmpty")} />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {passport.verified.map((skill) => (
                <VerifiedSkillCard key={skill.skill.id} skill={skill} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card data-testid="skills-in-assessment">
        <CardHeader title={t("passport.inAssessmentTitle")} />
        <CardContent className="pt-4">
          {passport.inAssessment.length === 0 ? (
            <EmptyState icon={<ClipboardIcon size={20} />} title={t("passport.inAssessmentEmpty")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {passport.inAssessment.map((entry) => (
                <li key={entry.skill.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="type-label text-foreground">{entry.skill.name}</p>
                  <ul className="flex flex-col gap-1">
                    {entry.attempts.map((attempt) => (
                      <li key={attempt.attemptId} className="flex flex-wrap items-center gap-2 type-body-small text-muted-foreground">
                        <Badge tone="info">{t(`passport.stage.${attempt.stage}`)}</Badge>
                        <span>{attempt.assessmentTitle}</span>
                        <span>
                          · {attempt.submittedAt ? `${t("passport.submitted")} ${date(attempt.submittedAt)}` : `${t("passport.started")} ${date(attempt.startedAt)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SelfReportedSection skills={passport.selfReported} verifiedIds={verifiedIds} />
    </div>
  );
}

function VerifiedSkillCard({ skill }: { skill: VerifiedSkillWithEvidence }) {
  const { t, locale } = useI18n();
  const outdated = skill.evidenceStatus === "OUTDATED";
  const level = verifiedSkillLevel(skill.score, skill.confidence);
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="type-h4 text-foreground">{skill.skill.name}</p>
        <Badge tone={outdated ? "warning" : "success"}>{outdated ? t("passport.outdated") : t("passport.verified")}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <dt className="type-caption text-muted-foreground">{t("passport.verifiedLevel")}</dt>
          <dd className="type-label text-foreground">{level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded")}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("passport.score")}</dt>
          <dd className="type-label text-foreground">{t("passport.scoreOutOf", { score: formatNumber(locale, skill.score, { maximumFractionDigits: 1 }) })}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("passport.confidence")}</dt>
          <dd className="type-label text-foreground">{formatNumber(locale, skill.confidence / 100, { style: "percent" })}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("passport.highestDifficulty")}</dt>
          <dd className="type-label text-foreground">{t(`passport.difficulty.${skill.highestDifficulty}`)}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("passport.lastVerified")}</dt>
          <dd className="type-label text-foreground">{formatDate(locale, new Date(skill.lastVerifiedAt))}</dd>
        </div>
      </dl>
      {outdated && <Alert tone="warning">{t("passport.outdatedBody")}</Alert>}
      <details className="type-body-small">
        <summary className="cursor-pointer text-accent">
          {t("passport.evidence")} ({skill.evidence.length})
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5 text-muted-foreground">
          {skill.evidence.map((item) => (
            <li key={item.evaluationId} className="flex flex-wrap items-center gap-2">
              <span className="text-foreground">{item.assessmentTitle}</span>
              {item.completedAt && <span>· {formatDate(locale, new Date(item.completedAt))}</span>}
              <span>· {t(`passport.reviewStatus.${item.reviewStatus}`)}</span>
              {item.superseded && <Badge tone="warning">{t("passport.superseded")}</Badge>}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function SelfReportedSection({ skills, verifiedIds }: { skills: SelfReportedSkill[]; verifiedIds: Set<string> }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const adding = useDialog<true>();
  const editing = useDialog<SelfReportedSkill>();
  const [removing, setRemoving] = useState<SelfReportedSkill | null>(null);
  const remove = useMutation({
    mutationFn: (skillId: string) => client.removeSelfReportedSkill(skillId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.passport(locale) }),
  });

  return (
    <Card data-testid="self-reported-skills">
      <CardHeader
        title={t("passport.selfReportedTitle")}
        description={t("passport.selfReportedNote")}
        action={
          <Button size="sm" variant="outline" onClick={() => adding.open(true)}>
            {t("passport.addSkill")}
          </Button>
        }
      />
      <CardContent className="pt-4">
        {remove.isError && <Alert tone="error" className="mb-3">{errorMessage(t, remove.error)}</Alert>}
        {skills.length === 0 ? (
          <EmptyState icon={<InboxIcon size={20} />} title={t("passport.selfReportedEmpty")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {skills.map((item) => (
              <li key={item.skill.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2 type-label text-foreground">
                    {item.skill.name}
                    <Badge>{t("passport.selfReported")}</Badge>
                    {verifiedIds.has(item.skill.id) && <Badge tone="success">{t("passport.alsoVerified")}</Badge>}
                  </p>
                  <p className="type-body-small text-muted-foreground">
                    {t(`passport.levels.${item.level}`)}
                    {item.yearsOfExperience !== null && ` · ${t("passport.yearsValue", { years: formatNumber(locale, item.yearsOfExperience) })}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" aria-label={`${t("common.edit")}: ${item.skill.name}`} onClick={() => editing.open(item)}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" aria-label={`${t("common.remove")}: ${item.skill.name}`} onClick={() => setRemoving(item)}>
                    {t("common.remove")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {adding.isOpen && <AddSkillDialog onOpenChange={adding.onOpenChange} existing={new Set(skills.map((s) => s.skill.id))} />}
      {editing.target && <EditSkillDialog skill={editing.target} onOpenChange={editing.onOpenChange} />}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("passport.removeSkillTitle")}
        description={removing?.skill.name}
        confirmLabel={t("common.remove")}
        destructive
        onConfirm={() => removing && remove.mutate(removing.skill.id)}
      />
    </Card>
  );
}

const levelOptions = (t: ReturnType<typeof useI18n>["t"]) => SELF_REPORTED_LEVELS.map((level) => ({ value: level, label: t(`passport.levels.${level}`) }));
const yearsValue = (text: string) => (text.trim() === "" ? null : Number(text.replace(",", ".")));

function AddSkillDialog({ onOpenChange, existing }: { onOpenChange: (open: boolean) => void; existing: Set<string> }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const results = useInfiniteQuery({
    queryKey: queryKeys.skillSearch(locale, search),
    queryFn: ({ pageParam }) => client.searchSkills({ q: search, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const options = (results.data?.pages.flatMap((page) => page.items) ?? []).filter((skill) => !existing.has(skill.id));

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={t("passport.addSkill")}
      initial={{ skillId: "", level: "INTERMEDIATE", years: "" }}
      schema={selfReportedSkillInputSchema}
      toInput={(v) => ({ skillId: v.skillId, level: v.level, yearsOfExperience: yearsValue(v.years) })}
      submit={(input) => client.addSelfReportedSkill(input)}
    >
      {({ values, set, error }) => (
        <>
          <Input label={t("passport.searchSkills")} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {results.isError ? (
            <Alert tone="error">{errorMessage(t, results.error)}</Alert>
          ) : results.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : options.length === 0 ? (
            <p className="type-body-small text-muted-foreground">{t("passport.noResults")}</p>
          ) : (
            <Select
              label={t("passport.skill")}
              value={values.skillId}
              placeholder=""
              onChange={(e) => set("skillId", e.target.value)}
              error={error("skillId")}
              options={options.map((skill) => ({ value: skill.id, label: `${skill.name} · ${skill.category}` }))}
            />
          )}
          {results.hasNextPage && (
            <Button size="sm" variant="ghost" className="self-start" loading={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>
              {t("common.showMore")}
            </Button>
          )}
          <Select
            label={t("passport.level")}
            value={values.level}
            onChange={(e) => set("level", SELF_REPORTED_LEVELS.find((level) => level === e.target.value) ?? values.level)}
            error={error("level")}
            options={levelOptions(t)}
          />
          <Input label={t("passport.years")} inputMode="decimal" helperText={t("passport.yearsHelper")} labelHint={t("common.optional")} value={values.years} onChange={(e) => set("years", e.target.value)} error={error("yearsOfExperience")} />
        </>
      )}
    </FormDialog>
  );
}

function EditSkillDialog({ skill, onOpenChange }: { skill: SelfReportedSkill; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const client = useApiClient();
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={t("passport.editSkill")}
      initial={{ level: skill.level, years: skill.yearsOfExperience === null ? "" : String(skill.yearsOfExperience) }}
      schema={selfReportedSkillUpdateSchema}
      toInput={(v) => ({ level: v.level, yearsOfExperience: yearsValue(v.years), expectedUpdatedAt: skill.updatedAt })}
      submit={(input) => client.updateSelfReportedSkill(skill.skill.id, input)}
    >
      {({ values, set, error }) => (
        <>
          <p className="flex items-center gap-2 type-label text-foreground">
            {skill.skill.name} <Badge>{t("passport.selfReported")}</Badge>
          </p>
          <Select
            label={t("passport.level")}
            value={values.level}
            onChange={(e) => set("level", SELF_REPORTED_LEVELS.find((level) => level === e.target.value) ?? values.level)}
            error={error("level")}
            options={levelOptions(t)}
          />
          <Input label={t("passport.years")} inputMode="decimal" helperText={t("passport.yearsHelper")} labelHint={t("common.optional")} value={values.years} onChange={(e) => set("years", e.target.value)} error={error("yearsOfExperience")} />
        </>
      )}
    </FormDialog>
  );
}
