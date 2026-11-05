"use client";

import Link from "next/link";
import { Fragment } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { pageItems } from "../../lib/ui-helpers";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** The last item is the current page and is not a link. */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("components.breadcrumb")} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 type-body-small text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {isCurrent || !item.href ? (
                  <span aria-current={isCurrent ? "page" : undefined} className={cn(isCurrent && "font-medium text-foreground")}>
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="rounded-sm hover:text-foreground">
                    {item.label}
                  </Link>
                )}
              </li>
              {!isCurrent && (
                <li role="presentation" aria-hidden="true">
                  <ChevronRightIcon size={14} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function Pagination({ page, pageCount, onPageChange, className }: { page: number; pageCount: number; onPageChange: (page: number) => void; className?: string }) {
  const { t } = useI18n();
  const item = "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-3 type-label transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";
  return (
    <nav aria-label={t("components.pagination")} className={className}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <button type="button" className={cn(item, "text-foreground hover:bg-muted")} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeftIcon size={16} />
            <span className="max-sm:sr-only">{t("components.previousPage")}</span>
          </button>
        </li>
        {pageItems(page, pageCount).map((p, index) =>
          p === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                aria-current={p === page ? "page" : undefined}
                aria-label={p === page ? t("components.currentPage", { page: p }) : t("components.page", { page: p })}
                onClick={() => onPageChange(p)}
                className={cn(item, p === page ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={cn(item, "text-foreground hover:bg-muted")} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <span className="max-sm:sr-only">{t("components.nextPage")}</span>
            <ChevronRightIcon size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
