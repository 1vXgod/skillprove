"use client";

import { takeableState, type TakeableState } from "@skillprove/shared";
import type { TakeableAssessment } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ClipboardIcon } from "../icons";
import { Alert, Badge, Button, Card, CardContent, EmptyState, Skeleton, type Tone } from "../ui";

/**
 * Published public assessments the candidate can take (Milestone 7, slice 17, as slice 13 on
 * mobile). Browsing only: starting an attempt on the web is slice 18, so the cards are not
 * links yet. The phone app can already take them.
 */
export function TakeableList() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const list = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });

  if (list.isPending) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")} className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }
  if (list.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, list.error)}
          <Button size="sm" variant="outline" onClick={() => void list.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  if (list.data.items.length === 0) return <EmptyState icon={<ClipboardIcon size={20} />} title={t("take.empty")} />;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {list.data.items.map((item) => (
        <li key={item.assessmentId}>
          <TakeableCard item={item} />
        </li>
      ))}
    </ul>
  );
}

const STATE_BADGES: Record<TakeableState, { tone: Tone; key: "take.inProgress" | "take.noAttemptsLeft" } | null> = {
  inProgress: { tone: "info", key: "take.inProgress" },
  noAttemptsLeft: { tone: "neutral", key: "take.noAttemptsLeft" },
  available: null,
};

function TakeableCard({ item }: { item: TakeableAssessment }) {
  const { t } = useI18n();
  const badge = STATE_BADGES[takeableState(item)];
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 pt-5">
        <h2 className="type-h4 text-foreground">{item.title}</h2>
        {item.description && <p className="type-body-small text-muted-foreground">{item.description}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge>{t(`passport.difficulty.${item.difficulty}`)}</Badge>
          {item.skills.map((skill) => (
            <Badge key={skill.skillId} tone="info">
              {skill.name}
            </Badge>
          ))}
          {badge && <Badge tone={badge.tone}>{t(badge.key)}</Badge>}
        </div>
        <p className="mt-auto type-body-small text-muted-foreground">
          {t("take.questions", { count: item.questionCount })} ·{" "}
          {item.durationMinutes ? t("take.minutes", { minutes: item.durationMinutes }) : t("take.noTimeLimit")} ·{" "}
          {t("take.attempts", { used: item.attemptsUsed, max: item.maxAttempts })}
        </p>
      </CardContent>
    </Card>
  );
}
