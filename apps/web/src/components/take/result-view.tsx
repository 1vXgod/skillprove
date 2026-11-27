"use client";

import { resultPollInterval, skillStanding } from "@skillprove/assessment-engine";
import { formatNumber } from "@skillprove/shared/i18n";
import type { AttemptResult, SkillPassport } from "@skillprove/validation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { WarningIcon } from "../icons";
import { MedalFor } from "../passport/medal";
import { Alert, Badge, Button, buttonClasses, Card, CardContent, CardHeader, EmptyState, Progress, Separator, Spinner } from "../ui";

/**
 * The result of a submitted attempt (Milestone 7, slice 19, as slice 15 on mobile). Polls while
 * scoring runs, then shows the overall and per-skill percentages for this attempt and each
 * skill's Skill Passport level. The API never says which questions were right, so neither does
 * this screen.
 */
export function ResultView({ attemptId, title }: { attemptId: string; title: string }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const result = useQuery({
    queryKey: queryKeys.attemptResult(attemptId, locale),
    queryFn: () => client.getAttemptResult(attemptId),
    retry: false,
    refetchInterval: (query) => resultPollInterval(query.state.data?.state),
  });
  const scored = result.data?.state === "scored";
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, enabled: scored, retry: false });

  // A new result changes the Skill Passport and the attempt counts in the list.
  useEffect(() => {
    if (!scored) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.passport(locale) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.takeable(locale) });
  }, [scored, queryClient, locale]);

  const actions = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link href="/skill-passport" className={buttonClasses()}>
        {t("take.openPassport")}
      </Link>
      <Link href="/take" className={buttonClasses({ variant: "outline" })}>
        {t("take.backToList")}
      </Link>
    </div>
  );

  let body;
  if (result.isError) {
    body = (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, result.error)}
          <Button size="sm" variant="outline" onClick={() => void result.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  } else if (result.isPending || result.data.state === "pending") {
    body = (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <Spinner />
          <p className="type-h3 text-foreground">{t("take.calculating")}</p>
          <p className="type-body text-muted-foreground">{t("take.calculatingBody")}</p>
        </CardContent>
      </Card>
    );
  } else if (result.data.state === "failed") {
    body = (
      <>
        <EmptyState icon={<WarningIcon size={20} />} title={t("take.failedTitle")} description={t("take.failedBody")} />
        {actions}
      </>
    );
  } else {
    body = (
      <>
        <Scored result={result.data} passport={passport.data} />
        {actions}
      </>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="type-h1 text-foreground">{title}</h1>
      {body}
    </div>
  );
}

function Scored({ result, passport }: { result: AttemptResult; passport: SkillPassport | undefined }) {
  const { t, locale } = useI18n();
  const percent = (value: number) => formatNumber(locale, value / 100, { style: "percent", maximumFractionDigits: 0 });
  return (
    <>
      <section className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-sidebar to-glow-primary p-8 text-center text-sidebar-foreground shadow-card">
        <div className="flex flex-col items-center gap-1">
          <h2 className="type-label text-sidebar-muted">{t("take.overall")}</h2>
          <p className="type-display tabular-nums text-sidebar-foreground">{percent(result.percent ?? 0)}</p>
          <p className="type-body-small text-sidebar-muted">{t("take.questions", { count: result.questionCount })}</p>
        </div>
      </section>
      <Card>
        <CardHeader title={t("take.bySkill")} />
        <CardContent>
          <ul className="flex flex-col gap-3">
            {result.skills.map((skill, i) => {
              const standing = skillStanding(passport, skill.skillId);
              return (
                <li key={skill.skillId} className="flex flex-col gap-1.5">
                  {i > 0 && <Separator className="mb-1.5" />}
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="type-h4 text-foreground">{skill.name}</h3>
                    <span className="type-h4 tabular-nums text-foreground">{percent(skill.percent)}</span>
                  </div>
                  <Progress value={skill.percent} label={`${skill.name}: ${percent(skill.percent)}`} />
                  <p className="type-body-small text-muted-foreground">{t("take.answeredOf", { answered: skill.answeredCount, total: skill.questionCount })}</p>
                  {standing && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="type-body-small text-muted-foreground">{t("take.passportLevel")}</span>
                      <span className="flex items-center gap-2">
                        {standing.kind === "level" && <MedalFor medal={standing.medal} outdated={standing.outdated} />}
                        <Badge tone={standing.kind === "level" ? "success" : "neutral"}>
                          {standing.kind === "level" ? t(`passport.levels.${standing.level}`) : t("passport.moreAssessmentsNeeded")}
                        </Badge>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
