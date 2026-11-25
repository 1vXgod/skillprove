"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { AppShell } from "./app-shell";
import { UserMenu } from "./user-menu";

/**
 * The shell for signed-in pages, with the Company section only for company members. Until the
 * user is loaded, or if loading fails, the section stays hidden: it only decides what is shown,
 * and the API checks membership on every request.
 */
export function SignedInAppShell({ showDesignSystem, children }: { showDesignSystem: boolean; children: ReactNode }) {
  const client = useApiClient();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: client.getCurrentUser, retry: false });
  return (
    <AppShell account={<UserMenu />} showDesignSystem={showDesignSystem} isCompanyMember={(me.data?.companies.length ?? 0) > 0}>
      {children}
    </AppShell>
  );
}
