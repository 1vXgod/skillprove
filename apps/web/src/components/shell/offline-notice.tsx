"use client";

import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useI18n } from "../../lib/i18n";
import { Alert } from "../ui";

/**
 * Says so while the browser is offline. TanStack Query pauses requests then, so screens would
 * otherwise sit on their loading state; the paused requests run by themselves once the browser
 * is back online, and this notice goes away.
 */
export function OfflineNotice() {
  const { t } = useI18n();
  const online = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
  if (online) return null;
  return (
    <div role="status" className="mb-6">
      <Alert tone="warning">{t("errors.offline")}</Alert>
    </div>
  );
}
