"use client";

import { formatDate } from "@skillprove/shared/i18n";
import type { AssessmentDetail } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { Alert, Badge, Button, Card, CardContent, Skeleton } from "../ui";
import { LoadError } from "./assessment-list";
import { statusTone } from "./shared";

/** What a candidate would see. The API response has no answers, so none can be shown here. */
export function CandidatePreview({ detail }: { detail: AssessmentDetail }) {
  const { t } = useI18n();
  const client = useApiClient();
  const preview = useQuery({
    queryKey: [...queryKeys.assessmentPreview(detail.id), detail.version.updatedAt],
    queryFn: () => client.getAssessmentPreview(detail.id),
    retry: false,
  });
  if (preview.isPending) return <Skeleton className="h-48 w-full" />;
  if (preview.isError) return <LoadError message={errorMessage(t, preview.error)} onRetry={() => void preview.refetch()} />;
  const p = preview.data;
  return (
    <article className="flex max-w-3xl flex-col gap-5" data-testid="candidate-preview">
      <Alert tone="info">{t("assessments.preview.notice")}</Alert>
      <header className="flex flex-col gap-2">
        <h2 className="type-h2 text-foreground">{p.title}</h2>
        {p.description && <p className="type-body text-muted-foreground">{p.description}</p>}
        {p.durationMinutes && <p className="type-label text-muted-foreground">{t("assessments.preview.minutes", { minutes: p.durationMinutes })}</p>}
        {p.instructions && <p className="type-body whitespace-pre-line text-foreground">{p.instructions}</p>}
      </header>
      <ol className="flex flex-col gap-4">
        {p.questions.map((q) => (
          <li key={q.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-4">
                <p className="type-label text-muted-foreground">{t("assessments.question.number", { position: q.position })}</p>
                {q.scenario && <p className="whitespace-pre-line text-foreground">{q.scenario}</p>}
                {(q.prompt ?? q.task ?? q.description) && <p className="whitespace-pre-line font-medium text-foreground">{q.prompt ?? q.task ?? q.description}</p>}
                {q.kind === "multiple_select" && <p className="type-caption text-muted-foreground">{t("assessments.preview.selectMany")}</p>}
                {q.choices && (
                  <ul className="flex flex-col gap-2">
                    {q.choices.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                        <span aria-hidden="true" className={q.kind === "multiple_select" ? "size-4 rounded-sm border border-input" : "size-4 rounded-full border border-input"} />
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {q.kind === "true_false" && (
                  <ul className="flex gap-2">
                    {([t("assessments.question.true"), t("assessments.question.false")] as const).map((label) => (
                      <li key={label} className="rounded-md border border-border px-4 py-2">
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
                {q.requirements && (
                  <div>
                    <p className="type-label">{t("assessments.preview.requirements")}</p>
                    <ul className="list-disc pl-5">{q.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                )}
                {q.deliverables && (
                  <div>
                    <p className="type-label">{t("assessments.preview.deliverables")}</p>
                    <ul className="list-disc pl-5">{q.deliverables.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                )}
                {(q.kind === "short_answer" || q.kind === "scenario" || q.kind === "practical_task") && (
                  <p className="rounded-md border border-dashed border-border p-3 type-body-small text-muted-foreground">{t("assessments.preview.provideAnswer")}</p>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function VersionHistory({ detail, canAuthor }: { detail: AssessmentDetail; canAuthor: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const versions = useQuery({ queryKey: [...queryKeys.versions(detail.id), detail.version.updatedAt], queryFn: () => client.listVersions(detail.id), retry: false });
  const restore = useMutation({
    mutationFn: (versionId: string) => client.restoreVersion(detail.id, versionId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.assessment(detail.id, locale), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.versions(detail.id) });
    },
  });

  if (versions.isPending) return <Skeleton className="h-24 w-full" />;
  if (versions.isError) return <LoadError message={errorMessage(t, versions.error)} onRetry={() => void versions.refetch()} />;
  return (
    <div className="flex max-w-2xl flex-col gap-3" data-testid="version-history">
      <p className="type-body-small text-muted-foreground">{t("assessments.versions.immutable")}</p>
      {restore.isError && <Alert tone="error">{errorMessage(t, restore.error)}</Alert>}
      {restore.isSuccess && <Alert tone="success">{t("assessments.versions.restored")}</Alert>}
      {detail.hasOpenDraft && canAuthor && <p className="type-caption text-muted-foreground">{t("assessments.versions.restoreBlocked")}</p>}
      <ul className="flex flex-col gap-2">
        {versions.data.items.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="type-label">{t("assessments.versions.version", { version: v.version })}</span>
                <Badge tone={statusTone[v.status]}>{t(`assessments.status.${v.status}`)}</Badge>
              </span>
              <span className="type-caption text-muted-foreground">
                {v.publishedAt ? t("assessments.versions.publishedAt", { date: formatDate(locale, new Date(v.publishedAt)) }) : t("assessments.versions.createdAt", { date: formatDate(locale, new Date(v.createdAt)) })}
              </span>
            </div>
            {canAuthor && (
              <Button size="sm" variant="outline" disabled={detail.hasOpenDraft} loading={restore.isPending && restore.variables === v.id} onClick={() => restore.mutate(v.id)}>
                {t("assessments.versions.restore")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
