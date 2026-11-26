import { loadState } from "@skillprove/shared";
import { spacing } from "@skillprove/shared/design";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { errorMessage } from "../lib/use-api";
import { useI18n } from "../theme/preferences-provider";
import { Alert, Button, Skeleton } from "./ui";

/** The parts of a TanStack query (plain or infinite) this needs. */
export interface QueryLike {
  status: "pending" | "error" | "success";
  fetchStatus: "fetching" | "paused" | "idle";
  error: unknown;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * The loading, offline and failed states every mobile screen shows for a query, so they all look
 * and behave the same. Offline, the request waits and runs by itself when the connection
 * returns; Try again is there for people who want to press something. Renders nothing once the
 * query has data, so screens use it as `if (!query.isSuccess) return <QueryState query={query} />`.
 *
 * `skeleton` gives the heights of the placeholder blocks, shaped like the content that is coming.
 * `header` stays visible above every state, such as a screen title.
 */
export function QueryState({ query, skeleton = [32, 56, 56], header }: { query: QueryLike; skeleton?: number[]; header?: ReactNode }): ReactElement | null {
  const { t } = useI18n();
  const state = loadState(query);
  if (state === "ready") return null;
  return (
    <View style={styles.gap}>
      {header}
      {state === "loading" ? (
        <View style={styles.gap} accessibilityLabel={t("common.loading")}>
          {skeleton.map((height, i) => (
            <Skeleton key={i} height={height} />
          ))}
        </View>
      ) : state === "offline" ? (
        <>
          <Alert tone="warning" message={t("errors.offline")} />
          <Button label={t("common.tryAgain")} variant="outline" onPress={() => void query.refetch()} />
        </>
      ) : (
        <>
          <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, query.error)} />
          <Button label={t("common.tryAgain")} variant="outline" loading={query.isFetching} onPress={() => void query.refetch()} />
        </>
      )}
    </View>
  );
}

/** Shown next to data that is on screen while an update or a send waits for the connection. */
export function OfflineNotice({ visible }: { visible: boolean }): ReactElement | null {
  const { t } = useI18n();
  return visible ? <Alert tone="warning" message={t("errors.offline")} /> : null;
}

const styles = StyleSheet.create({ gap: { gap: spacing[4] } });
