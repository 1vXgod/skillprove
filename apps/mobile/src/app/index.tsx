import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { AccountSection } from "../components/account-panel";
import { Screen } from "../components/shell/screen";
import { AppText, Badge, Button, Card, Separator, type Tone } from "../components/ui";
import { api, apiBaseUrl } from "../lib/api";
import { useI18n } from "../theme/preferences-provider";

export default function StatusScreen() {
  const { t } = useI18n();
  const health = useQuery({ queryKey: ["health"], queryFn: api.getHealth, retry: false });
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: api.getReadiness, retry: false });

  function refresh() {
    void health.refetch();
    void readiness.refetch();
  }

  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="h1" accessibilityRole="header">
          {t("status.title")}
        </AppText>
        <AppText tone="mutedForeground">{t("status.descriptionMobile")}</AppText>
      </View>

      <Card style={styles.card}>
        <StatusRow testID="api-status" label={t("status.api")} query={health} />
        <Separator />
        <StatusRow testID="database-status" label={t("status.database")} query={readiness} />
      </Card>

      <AppText variant="caption" tone="mutedForeground">
        {apiBaseUrl ?? t("status.noApiUrl")}
      </AppText>

      <Button label={t("status.checkAgain")} icon="refresh-cw" variant="outline" onPress={refresh} fullWidth />

      <AccountSection />
    </Screen>
  );
}

function StatusRow({ testID, label, query }: { testID: string; label: string; query: UseQueryResult }) {
  const { t } = useI18n();
  const { text, tone }: { text: string; tone: Tone } = query.isFetching
    ? { text: t("status.checking"), tone: "neutral" }
    : query.isError
      ? { text: t("status.unavailable"), tone: "error" }
      : { text: t("status.connected"), tone: "success" };

  return (
    <View style={styles.row} testID={testID}>
      <AppText variant="label">{label}</AppText>
      <Badge tone={tone} label={text} />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 8 },
  card: { paddingVertical: 4, gap: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
});
