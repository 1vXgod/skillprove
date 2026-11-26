import { loadState } from "@skillprove/shared";
import { spacing } from "@skillprove/shared/design";
import type { OwnProfile } from "@skillprove/validation";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { errorMessage } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { Alert, Button, Skeleton } from "../ui";

/**
 * Loading, offline and failed states for the screens that edit the user's own profile. A failed
 * load must never look like "no profile yet": that would offer to create a profile that already
 * exists. Offline, the request waits and runs by itself when the connection returns. Renders
 * nothing once the profile (or its absence) is known.
 */
export function ProfileLoadState({ profile }: { profile: UseQueryResult<OwnProfile | null> }): ReactElement | null {
  const { t } = useI18n();
  switch (loadState(profile)) {
    case "ready":
      return null;
    case "loading":
      return (
        <View style={styles.gap} accessibilityLabel={t("common.loading")}>
          <Skeleton height={32} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      );
    case "offline":
      return (
        <View style={styles.gap}>
          <Alert tone="warning" message={t("errors.offline")} />
          <Button label={t("common.tryAgain")} variant="outline" onPress={() => void profile.refetch()} />
        </View>
      );
    case "error":
      return (
        <View style={styles.gap}>
          <Alert tone="error" title={t("errors.loadFailed")} message={errorMessage(t, profile.error)} />
          <Button label={t("common.tryAgain")} variant="outline" loading={profile.isFetching} onPress={() => void profile.refetch()} />
        </View>
      );
  }
}

const styles = StyleSheet.create({ gap: { gap: spacing[4] } });
