"use client";

import { ASSESSMENT_STATUSES } from "@skillprove/shared";
import { formatDate } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ClipboardIcon } from "../icons";
import { Alert, Badge, buttonClasses, Button, Card, CardContent, EmptyState, Pagination, Select, Skeleton } from "../ui";
import { statusTone, useCompany } from "./shared";

const PAGE_SIZE = 10;

/** The assessment dashboard: a paginated list with a status filter, and the way into creation. */
export function AssessmentList() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const company = useCompany();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const list = useQuery({
    queryKey: [...queryKeys.assessments(company.companyId ?? ""), page, status],
    queryFn: () => client.listAssessments(company.companyId as string, { page, pageSize: PAGE_SIZE, status: status || undefined }),
    enabled: company.companyId !== null,
    retry: false,
  });

  if (company.query.isPending) return <ListSkeleton label={t("common.loading")} />;
  if (company.query.isError) return <LoadError message={errorMessage(t, company.query.error)} onRetry={() => void company.query.refetch()} />;
  if (!company.companyId) {
    return <EmptyState icon={<ClipboardIcon size={20} />} title={t("assessments.noCompany")} />;
  }

  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const createLink = (
    <Link href={`/assessments/new?company=${company.companyId}`} className={buttonClasses({})}>
      {t("assessments.create")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4" data-testid="assessment-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          {company.companies.length > 1 && (
            <Select
              label={t("assessments.company")}
              value={company.companyId}
              onChange={(e) => {
                company.choose(e.target.value);
                setPage(1);
              }}
              options={company.companies.map((c) => ({ value: c.companyId, label: `${c.companyId.slice(0, 8)} · ${c.role}` }))}
            />
          )}
          <Select
            label={t("assessments.list.filterStatus")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: t("assessments.list.filterAll") }, ...ASSESSMENT_STATUSES.map((s) => ({ value: s, label: t(`assessments.status.${s}`) }))]}
          />
        </div>
        {company.canAuthor ? createLink : <p className="type-body-small text-muted-foreground">{t("assessments.noPermission")}</p>}
      </div>

      {list.isPending ? (
        <ListSkeleton label={t("assessments.list.loading")} />
      ) : list.isError ? (
        <LoadError message={errorMessage(t, list.error)} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardIcon size={20} />}
          title={t("assessments.list.empty")}
          description={company.canAuthor ? t("assessments.list.emptyDescription") : undefined}
          action={company.canAuthor ? createLink : undefined}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {list.data.items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Link href={`/assessments/${item.id}`} className="type-h4 truncate text-foreground hover:underline">
                        {item.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone[item.status]}>{t(`assessments.status.${item.status}`)}</Badge>
                        {item.assessmentType && <Badge>{t(`assessments.type.${item.assessmentType}`)}</Badge>}
                        <Badge>{t(`assessments.difficulty.${item.difficulty as "BEGINNER"}`)}</Badge>
                        <Badge>{t(`assessments.source.${item.creationSource}`)}</Badge>
                      </div>
                      <p className="type-body-small text-muted-foreground">
                        {t("assessments.list.questions", { count: item.questionCount })} · {t("assessments.list.version", { version: item.version })} ·{" "}
                        {t("assessments.list.updated", { date: formatDate(locale, new Date(item.updatedAt)) })}
                      </p>
                    </div>
                    <Link href={`/assessments/${item.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                      {company.canAuthor ? t("assessments.editor.title") : t("assessments.preview.title")}
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {pages > 1 && <Pagination page={page} pageCount={pages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Alert tone="error" title={t("errors.loadFailed")}>
      <div className="flex flex-col items-start gap-2">
        {message}
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      </div>
    </Alert>
  );
}
