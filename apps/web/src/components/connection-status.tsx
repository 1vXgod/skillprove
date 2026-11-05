"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Badge, Card } from "./ui";

export function ConnectionStatus() {
  const { t } = useI18n();
  const health = useQuery({ queryKey: ["health"], queryFn: api.getHealth, retry: false });
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: api.getReadiness, retry: false });

  return (
    <Card>
      <dl className="divide-y divide-border">
        <StatusRow testId="api-status" label={t("status.api")} query={health} />
        <StatusRow testId="database-status" label={t("status.database")} query={readiness} />
      </dl>
    </Card>
  );
}

function StatusRow({ testId, label, query }: { testId: string; label: string; query: UseQueryResult }) {
  const { t } = useI18n();
  const { text, tone } = query.isPending
    ? { text: t("status.checking"), tone: "neutral" as const }
    : query.isError
      ? { text: t("status.unavailable"), tone: "error" as const }
      : { text: t("status.connected"), tone: "success" as const };

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className="type-label text-foreground">{label}</dt>
      <dd>
        <Badge tone={tone}>
          <span data-testid={testId}>{text}</span>
        </Badge>
      </dd>
    </div>
  );
}
