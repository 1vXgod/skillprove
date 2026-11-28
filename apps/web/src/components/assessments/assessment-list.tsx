"use client";

import { ASSESSMENT_STATUS_TONE, ASSESSMENT_STATUSES, type AssessmentStatus } from "@skillprove/shared";
import { formatDate } from "@skillprove/shared/i18n";
import type { AssessmentListItem } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { ArchiveIcon, ChevronRightIcon, ClipboardIcon, ClockIcon, EditIcon, PlusIcon, SparkleIcon, SuccessIcon } from "../icons";
import { Alert, Badge, buttonClasses, Button, Card, CardContent, Chip, ChipGroup, EmptyState, IconTile, Pagination, Select, Skeleton } from "../ui";
import { useCompany } from "./shared";

const PAGE_SIZE = 10;

const STATUS_TILE: Record<AssessmentStatus, { icon: ReactNode; tone: "warning" | "success" | "neutral" }> = {
  DRAFT: { icon: <EditIcon size={18} />, tone: "warning" },
  PUBLISHED: { icon: <SuccessIcon size={18} />, tone: "success" },
  ARCHIVED: { icon: <ArchiveIcon size={18} />, tone: "neutral" },
};

/** The assessment dashboard: a paginated list with a status filter, and the way into creation. */
export function AssessmentList() {
  const { t } = useI18n();
  const client = useApiClient();
  const company = useCompany();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AssessmentStatus | "">("");

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
    <Link href={`/assessments/new?company=${company.companyId}`} className={buttonClasses({ variant: "glow" })}>
      <PlusIcon size={18} />
      {t("assessments.create")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5" data-testid="assessment-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ChipGroup
          legend={t("assessments.list.filterStatus")}
          name="status"
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[{ value: "" as const, label: t("assessments.list.filterAll") }, ...ASSESSMENT_STATUSES.map((s) => ({ value: s, label: t(`assessments.status.${s}`) }))]}
        />
        {company.canAuthor ? createLink : <p className="type-body-small text-muted-foreground">{t("assessments.noPermission")}</p>}
      </div>

      {company.companies.length > 1 && (
        <div className="flex max-w-md flex-col gap-1">
          <Select
            label={t("assessments.company")}
            value={company.companyId}
            onChange={(e) => {
              company.choose(e.target.value);
              setPage(1);
            }}
            options={company.companies.map((c) => ({ value: c.companyId, label: `${c.companyId.slice(0, 8)} · ${c.role}` }))}
          />
          {/* Unfinished until M8: the API has no company names yet, and none are invented here. */}
          <p className="type-caption text-muted-foreground">{t("assessments.list.companyUnfinished")}</p>
        </div>
      )}

      {list.isPending ? (
        <ListSkeleton label={t("assessments.list.loading")} />
      ) : list.isError ? (
        <LoadError message={errorMessage(t, list.error)} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<ClipboardIcon size={20} />}
              title={t("assessments.list.empty")}
              description={company.canAuthor ? t("assessments.list.emptyDescription") : undefined}
              action={company.canAuthor ? createLink : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {list.data.items.map((item) => (
              <li key={item.id}>
                <AssessmentCard item={item} canAuthor={company.canAuthor} />
              </li>
            ))}
          </ul>
          {pages > 1 && <Pagination page={page} pageCount={pages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function AssessmentCard({ item, canAuthor }: { item: AssessmentListItem; canAuthor: boolean }) {
  const { t, locale } = useI18n();
  const tile = STATUS_TILE[item.status];
  return (
    <Card className="transition-colors duration-150 hover:border-primary/40">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <IconTile icon={tile.icon} tone={tile.tone} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/assessments/${item.id}`} className="type-h4 min-w-0 break-words text-foreground hover:underline">
                {item.title}
              </Link>
              <Badge tone={ASSESSMENT_STATUS_TONE[item.status]}>{t(`assessments.status.${item.status}`)}</Badge>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-body-small text-muted-foreground">
              <span>{t("assessments.list.questions", { count: item.questionCount })}</span>
              <span>{t("assessments.list.version", { version: item.version })}</span>
              <span className="inline-flex items-center gap-1">
                <ClockIcon size={14} />
                {t("assessments.list.updated", { date: formatDate(locale, new Date(item.updatedAt)) })}
              </span>
            </p>
            <ul className="flex flex-wrap gap-2">
              {item.assessmentType && <Chip>{t(`assessments.type.${item.assessmentType}`)}</Chip>}
              <Chip>{t(`assessments.difficulty.${item.difficulty as "BEGINNER"}`)}</Chip>
              <Chip icon={item.creationSource === "AI_GENERATED" ? <SparkleIcon size={14} /> : undefined}>{t(`assessments.source.${item.creationSource}`)}</Chip>
            </ul>
          </div>
        </div>
        <Link href={`/assessments/${item.id}`} className={buttonClasses({ variant: "outline", size: "sm", className: "self-start sm:self-center" })}>
          {canAuthor ? t("assessments.editor.title") : t("assessments.preview.title")}
          <ChevronRightIcon size={16} />
        </Link>
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
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
