import { Feather } from "@expo/vector-icons";
import { PROFILE_LANGUAGE_CODES, PROFILE_VISIBILITIES, skillMedal, type ProfileVisibility } from "@skillprove/shared";
import { radius, spacing } from "@skillprove/shared/design";
import { formatNumber } from "@skillprove/shared/i18n";
import type { CandidateView, OwnProfile, PrivacyInput } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { MedalFor } from "../../components/medal-for";
import { QueryState } from "../../components/query-state";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Avatar, Badge, Button, Card, CardHeader, IconTile, RadioGroup, Separator, SkillMedal, Switch, type IconName } from "../../components/ui";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n, useTheme } from "../../theme/preferences-provider";

type Flag = keyof Omit<PrivacyInput, "visibility" | "expectedUpdatedAt" | "isDiscoverable">;

const VISIBILITY_ICONS: Record<ProfileVisibility, IconName> = { PRIVATE: "lock", VERIFIED_COMPANIES: "shield", ALL_COMPANIES: "briefcase", PUBLIC: "globe" };

/** The section switches, grouped as people think of them. */
const GROUPS: { key: "contact" | "background" | "skills"; flags: { flag: Flag; icon?: IconName }[] }[] = [
  {
    key: "contact",
    flags: [
      { flag: "showContactEmail", icon: "mail" },
      { flag: "showPhoneNumber", icon: "phone" },
      { flag: "showLocation", icon: "map-pin" },
    ],
  },
  {
    key: "background",
    flags: [
      { flag: "showExperience", icon: "briefcase" },
      { flag: "showEducation", icon: "book-open" },
    ],
  },
  // A medal instead of an icon: medals reach companies only through this switch.
  { key: "skills", flags: [{ flag: "showVerifiedSkills" }] },
];

export default function PrivacyScreen() {
  // The save bar is set by the form and drawn by the screen, so it stays fixed while the form scrolls.
  const [footer, setFooter] = useState<ReactNode>(null);
  return (
    <Screen showBack footer={footer}>
      <SignedInGate>
        <Loader setFooter={setFooter} />
      </SignedInGate>
    </Screen>
  );
}

function Loader({ setFooter }: { setFooter: (footer: ReactNode) => void }) {
  const { t } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  const [savedVersion, setSavedVersion] = useState<string | null>(null);
  if (!profile.isSuccess) return <QueryState query={profile} skeleton={[160, 120]} />;
  if (!profile.data) return <AppText tone="mutedForeground">{t("profile.createDescription")}</AppText>;
  const version = profile.data.privacy.updatedAt;
  return <PrivacyForm key={version} profile={profile.data} justSaved={savedVersion === version} onSaved={setSavedVersion} setFooter={setFooter} />;
}

function PrivacyForm({ profile, justSaved, onSaved, setFooter }: { profile: OwnProfile; justSaved: boolean; onSaved: (version: string) => void; setFooter: (footer: ReactNode) => void }) {
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

  useEffect(() => {
    setFooter(
      dirty ? (
        <View style={styles.bar}>
          <AppText variant="label" style={styles.flex}>
            {t("privacy.unsaved")}
          </AppText>
          <Button
            label={t("privacy.discard")}
            variant="ghost"
            size="sm"
            disabled={save.isPending}
            onPress={() => {
              save.reset();
              setValues(stored);
            }}
          />
          <Button label={t("common.save")} size="sm" loading={save.isPending} onPress={() => save.mutate()} />
        </View>
      ) : null,
    );
    // `stored` and `save` are rebuilt each render; what the bar shows depends only on these.
  }, [dirty, save.isPending, values, t]);
  useEffect(() => () => setFooter(null), [setFooter]);

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("privacy.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("privacy.description")}</AppText>
      <Card>
        <View style={styles.heading}>
          <IconTile icon="eye" size="sm" />
          <AppText variant="h4" accessibilityRole="header" style={styles.flex}>
            {t("privacy.visibility")}
          </AppText>
        </View>
        <RadioGroup
          card
          label={t("privacy.visibility")}
          value={values.visibility}
          onChange={(visibility) => change({ visibility })}
          options={PROFILE_VISIBILITIES.map((v) => ({ value: v, label: t(`privacy.visibilities.${v}`), description: t(`privacy.visibilityHelp.${v}`), icon: VISIBILITY_ICONS[v] }))}
        />
      </Card>
      <Card>
        <AppText variant="h4" accessibilityRole="header">
          {t("privacy.sections")}
        </AppText>
        {GROUPS.map((group) => (
          <View key={group.key} style={styles.group}>
            <AppText variant="caption" tone="mutedForeground" style={styles.groupLabel}>
              {t(`privacy.groups.${group.key}`).toUpperCase()}
            </AppText>
            {group.flags.map(({ flag, icon }) => (
              <Switch
                key={flag}
                icon={icon}
                leading={icon ? undefined : <SkillMedal medal="gold" label="" size="sm" />}
                label={t(`privacy.${flag}`)}
                checked={values[flag]}
                onChange={(on) => change({ [flag]: on })}
              />
            ))}
          </View>
        ))}
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("privacy.alwaysShown")}
        </AppText>
      </Card>
      <Card>
        <AppText variant="h4" accessibilityRole="header">
          {t("privacy.search")}
        </AppText>
        <Switch icon="search" label={t("privacy.isDiscoverable")} description={t("privacy.isDiscoverableHelp")} checked={values.isDiscoverable} onChange={(on) => change({ isDiscoverable: on })} />
      </Card>
      {save.isError && <Alert tone="error" message={errorMessage(t, save.error)} />}
      {justSaved && !edited && <Alert tone="success" message={t("privacy.saved")} />}
      <Preview />
    </>
  );
}

/** Fetched from the API, so it shows exactly the filtering the server applies. */
function Preview() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const preview = useQuery({ queryKey: queryKeys.preview(locale), queryFn: client.getProfilePreview, retry: false });

  return (
    <Card>
      <CardHeader title={t("privacy.previewTitle")} description={t("privacy.previewNote")} />
      {!preview.isSuccess ? (
        <QueryState query={preview} skeleton={[120]} />
      ) : (
        <View style={styles.previewBody}>
          {preview.data.visibility === "PRIVATE" && <Alert tone="info" message={t("privacy.previewPrivate")} />}
          <PreviewBody view={preview.data.view} />
        </View>
      )}
    </Card>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const hidden = value === null;
  return (
    <View style={[styles.row, hidden && styles.faded]} accessible accessibilityLabel={`${label}: ${hidden ? t("common.hidden") : value}`}>
      <Feather name={hidden ? "eye-off" : "eye"} size={16} color={hidden ? colors.mutedForeground : colors.success} />
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      {hidden ? (
        <Badge label={t("common.hidden")} />
      ) : (
        <AppText variant="bodySmall" tone="mutedForeground" style={styles.value}>
          {value}
        </AppText>
      )}
    </View>
  );
}

function PreviewBody({ view }: { view: CandidateView }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const count = (items: unknown[] | null) => (items === null ? null : formatNumber(locale, items.length));
  const languageName = (code: string) => {
    const known = PROFILE_LANGUAGE_CODES.find((c) => c === code);
    return known ? t(`languages.names.${known}`) : code;
  };
  // Companies see the medals only when verified skills are shown.
  const medals = (view.verifiedSkills ?? []).map((v) => ({ id: v.skill.id, medal: skillMedal(v.score, v.confidence), outdated: v.evidenceStatus === "OUTDATED" })).filter((m) => m.medal !== null);
  const rows: [string, string | null][] = [
    [t("privacy.showLocation"), view.location ? [view.location.city, view.location.countryCode].filter(Boolean).join(", ") : null],
    [t("privacy.showContactEmail"), view.contact ? (view.contact.email ?? t("profile.notAdded")) : null],
    [t("privacy.showPhoneNumber"), view.contact ? (view.contact.phoneNumber ?? t("profile.notAdded")) : null],
    [t("experiences.title"), count(view.experiences)],
    [t("education.title"), count(view.education)],
    [t("certificates.title"), count(view.certificates)],
    [t("portfolio.title"), formatNumber(locale, view.portfolio.length)],
    [t("languages.title"), view.languages.map((l) => languageName(l.languageCode)).join(", ") || t("profile.notAdded")],
    [t("passport.selfReportedTitle"), formatNumber(locale, view.selfReportedSkills.length)],
    [t("passport.verifiedTitle"), count(view.verifiedSkills)],
  ];
  return (
    <View style={styles.previewBody}>
      <View style={[styles.company, { backgroundColor: colors.muted }]}>
        <Avatar name={view.fullName} />
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            {view.fullName}
          </AppText>
          {view.headline && (
            <AppText variant="bodySmall" tone="mutedForeground" numberOfLines={1}>
              {view.headline}
            </AppText>
          )}
        </View>
        {medals.length > 0 && (
          <View style={styles.medals}>
            {medals.map((m) => (
              <MedalFor key={m.id} medal={m.medal} outdated={m.outdated} />
            ))}
          </View>
        )}
      </View>
      <View>
        {rows.map(([label, value], index) => (
          <View key={label}>
            {index > 0 && <Separator />}
            <PreviewRow label={label} value={value} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  group: { gap: spacing[1] },
  groupLabel: { letterSpacing: 0.5, fontWeight: "500" },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  previewBody: { gap: spacing[3] },
  company: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3], borderRadius: radius.lg },
  medals: { flexDirection: "row", flexWrap: "wrap", gap: spacing[1] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2], minHeight: spacing[10], paddingVertical: spacing[1] },
  value: { maxWidth: "55%", textAlign: "right" },
  faded: { opacity: 0.6 },
});
