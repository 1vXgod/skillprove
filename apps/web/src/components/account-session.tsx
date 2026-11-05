"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@skillprove/api-client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { apiBaseUrl } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Alert, Badge, Card, CardContent, CardHeader, Skeleton } from "./ui";

const USER_STATUSES = ["ACTIVE", "SUSPENDED", "ANONYMIZED"] as const;

export function AccountSession() {
  const { t } = useI18n();
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl, getToken }), [getToken]);
  const account = useQuery({
    queryKey: ["current-user", userId],
    queryFn: client.getCurrentUser,
    enabled: Boolean(isSignedIn),
    retry: false,
  });

  if (!isLoaded || (isSignedIn && account.isPending)) {
    return (
      <Card aria-busy="true" aria-label={t("common.loading")}>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
        </CardContent>
      </Card>
    );
  }
  if (!isSignedIn) return <p className="type-body text-muted-foreground">{t("account.signedOut")}</p>;
  if (account.isError || !account.data) return <Alert tone="error">{t("account.loadFailed")}</Alert>;

  const { email, status, companies } = account.data;
  const knownStatus = USER_STATUSES.find((s) => s === status);
  const statusLabel = knownStatus ? t(`account.userStatus.${knownStatus}`) : status;
  return (
    <Card>
      <CardHeader title={t("account.title")} />
      <CardContent>
        <dl className="flex flex-col divide-y divide-border">
          <Row label={t("account.email")} value={email ?? t("account.emailNotVerified")} />
          <Row
            label={t("account.status")}
            value={<Badge tone={status === "ACTIVE" ? "success" : "warning"}>{statusLabel}</Badge>}
          />
          <Row label={t("account.companyMemberships")} value={String(companies.length)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="type-label text-foreground">{label}</dt>
      <dd className="break-all type-body text-muted-foreground">{value}</dd>
    </div>
  );
}
