import { PROFILE_VISIBILITIES, skillMedal } from "@skillprove/shared";
import { formatNumber } from "@skillprove/shared/i18n";
import type { OwnProfile } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Card, CardHeader, RadioGroup, Separator, Switch } from "../../components/ui";
import { MedalFor } from "../../components/medal-for";
import { QueryState } from "../../components/query-state";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

const FLAGS = ["showContactEmail", "showPhoneNumber", "showLocation", "showExperience", "showEducation", "showVerifiedSkills"] as const;

export default function PrivacyScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <Loader />
      </SignedInGate>
    </Screen>
  );
}

function Loader() {
  const { t } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  const [savedVersion, setSavedVersion] = useState<string | null>(null);
  if (!profile.isSuccess) return <QueryState query={profile} skeleton={[160, 120]} />;
  if (!profile.data) return <AppText tone="mutedForeground">{t("profile.createDescription")}</AppText>;
  const version = profile.data.privacy.updatedAt;
  return <PrivacyForm key={version} profile={profile.data} justSaved={savedVersion === version} onSaved={setSavedVersion} />;
}

function PrivacyForm({ profile, justSaved, onSaved }: { profile: OwnProfile; justSaved: boolean; onSaved: (version: string) => void }) {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { updatedAt, ...stored } = profile.privacy;
  const [values, setValues] = useState(stored);
  const [edited, setEdited] = useState(false);
  const save = useMutation({
    mutationFn: () => client.updatePrivacy({ ...values, expectedUpdatedAt: updatedAt }),
    onSuccess: async (data) => {
      onSaved(data.privacy.updatedAt);
      queryClient.setQueryData(queryKeys.ownProfile, data);
      await queryClient.invalidateQueries({ queryKey: ["profile-preview"] });
    },
  });
  const change = (next: Partial<typeof values>) => {
    setEdited(true);
    setValues((v) => ({ ...v, ...next }));
  };
  const dirty = JSON.stringify(values) !== JSON.stringify(stored);

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("privacy.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("privacy.description")}</AppText>
      <Card>
        <RadioGroup
          label={t("privacy.visibility")}
          value={values.visibility}
          onChange={(visibility) => change({ visibility })}
          options={PROFILE_VISIBILITIES.map((v) => ({ value: v, label: t(`privacy.visibilities.${v}`), description: t(`privacy.visibilityHelp.${v}`) }))}
        />
      </Card>
      <Card>
        <AppText variant="label">{t("privacy.sections")}</AppText>
        {FLAGS.map((flag) => (
          <Switch key={flag} label={t(`privacy.${flag}`)} checked={values[flag]} onChange={(on) => change({ [flag]: on })} />
        ))}
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("privacy.alwaysShown")}
        </AppText>
        <Separator />
        <Switch label={t("privacy.isDiscoverable")} description={t("privacy.isDiscoverableHelp")} checked={values.isDiscoverable} onChange={(on) => change({ isDiscoverable: on })} />
      </Card>
      {save.isError && <Alert tone="error" message={errorMessage(t, save.error)} />}
      {justSaved && !edited && <Alert tone="success" message={t("privacy.saved")} />}
      <Button label={t("common.save")} loading={save.isPending} disabled={!dirty} onPress={() => save.mutate()} fullWidth />
      <Preview />
    </>
  );
}

function Preview() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const preview = useQuery({ queryKey: queryKeys.preview(locale), queryFn: client.getProfilePreview, retry: false });
  const count = (items: unknown[] | null) => (items === null ? null : formatNumber(locale, items.length));

  return (
    <Card>
      <CardHeader title={t("privacy.previewTitle")} description={t("privacy.previewNote")} />
      {!preview.isSuccess ? (
        <QueryState query={preview} skeleton={[120]} />
      ) : (
        <View style={styles.rows}>
          {preview.data.visibility === "PRIVATE" && <Alert tone="info" message={t("privacy.previewPrivate")} />}
          {(
            [
              [t("privacy.showLocation"), preview.data.view.location ? [preview.data.view.location.city, preview.data.view.location.countryCode].filter(Boolean).join(", ") : null],
              [t("privacy.showContactEmail"), preview.data.view.contact ? (preview.data.view.contact.email ?? t("profile.notAdded")) : null],
              [t("experiences.title"), count(preview.data.view.experiences)],
              [t("education.title"), count(preview.data.view.education)],
              [t("portfolio.title"), formatNumber(locale, preview.data.view.portfolio.length)],
              [t("passport.verifiedTitle"), count(preview.data.view.verifiedSkills)],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.row}>
              <AppText variant="label" style={styles.flex}>
                {label}
              </AppText>
              {value === null ? <Badge label={t("common.hidden")} /> : <AppText variant="bodySmall" tone="mutedForeground">{value}</AppText>}
            </View>
          ))}
          {/* Companies see the medals only when verified skills are shown. */}
          {preview.data.view.verifiedSkills && preview.data.view.verifiedSkills.length > 0 && (
            <View style={styles.medals}>
              {preview.data.view.verifiedSkills.map((v) => (
                <MedalFor key={v.skill.id} medal={skillMedal(v.score, v.confidence)} outdated={v.evidenceStatus === "OUTDATED"} />
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 10 },
  medals: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  flex: { flex: 1 },
});
