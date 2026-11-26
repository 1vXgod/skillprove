import { PROFILE_COUNTRY_CODES, PROFILE_LANGUAGE_CODES, todayInKosovo, type ProfileSection } from "@skillprove/shared";
import { formatDate, formatPhone } from "@skillprove/shared/i18n";
import type { OwnProfile } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Avatar, Badge, Button, Card, CardHeader, EmptyState, Modal, Separator } from "../../components/ui";
import { QueryState } from "../../components/query-state";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";
import { spacing } from "@skillprove/shared/design";

export default function ProfileScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <ProfileContent />
      </SignedInGate>
    </Screen>
  );
}

function ProfileContent() {
  const { t } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });

  if (!profile.isSuccess) return <QueryState query={profile} skeleton={[96, 160]} />;
  if (!profile.data) {
    return (
      <Card>
        <CardHeader title={t("profile.createTitle")} description={t("profile.createDescription")} />
        <Button label={t("profile.createAction")} onPress={() => router.push("/profile/edit")} fullWidth />
      </Card>
    );
  }
  return <ProfileDetails profile={profile.data} />;
}

function Row({ title, lines, onPress, badge }: { title: string; lines: (string | null | undefined)[]; onPress: () => void; badge?: ReactNode }) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <View style={styles.inline}>
          <AppText variant="label">{title}</AppText>
          {badge}
        </View>
        {lines.filter(Boolean).map((line, index) => (
          <AppText key={index} variant="bodySmall" tone="mutedForeground">
            {line}
          </AppText>
        ))}
      </View>
      <Button label={t("common.edit")} variant="ghost" size="sm" onPress={onPress} accessibilityLabel={`${t("common.edit")}: ${title}`} />
    </View>
  );
}

function Section({ title, addLabel, onAdd, empty, isEmpty, children }: { title: string; addLabel: string; onAdd: () => void; empty: string; isEmpty: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      {isEmpty ? <EmptyState title={empty} /> : <View>{children}</View>}
      <Button label={addLabel} variant="outline" icon="plus" onPress={onAdd} fullWidth />
    </Card>
  );
}

function ProfileDetails({ profile }: { profile: OwnProfile }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [deletingProfile, setDeletingProfile] = useState(false);
  const removeProfile = useMutation({
    mutationFn: client.deleteProfile,
    onSuccess: () => {
      setDeletingProfile(false);
      queryClient.setQueryData(queryKeys.ownProfile, null);
    },
  });

  const month = (date: string | null) => (date ? formatDate(locale, new Date(`${date}T00:00:00Z`), { year: "numeric", month: "short" }) : null);
  const range = (start: string | null, end: string | null, current = false) => [month(start), current ? t("common.present") : month(end)].filter(Boolean).join(" – ");
  const edit = (section: ProfileSection, id?: string) => router.push({ pathname: "/profile/item", params: id ? { section, id } : { section } });
  const country = PROFILE_COUNTRY_CODES.find((code) => code === profile.countryCode);
  const languageName = (code: string) => {
    const known = PROFILE_LANGUAGE_CODES.find((c) => c === code);
    return known ? t(`languages.names.${known}`) : code;
  };
  const today = todayInKosovo();
  const a = profile.availability;

  return (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {t("profile.title")}
      </AppText>

      <Card>
        <View style={styles.identity}>
          <Avatar name={profile.fullName} size="lg" />
          <View style={styles.rowText}>
            <AppText variant="h3">{profile.fullName}</AppText>
            {profile.headline && <AppText tone="mutedForeground">{profile.headline}</AppText>}
            <AppText variant="bodySmall" tone="mutedForeground">
              {[profile.city, country ? t(`profile.countries.${country}`) : profile.countryCode].filter(Boolean).join(", ")}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="mutedForeground">
          {t("profile.photoUnavailable")}
        </AppText>
        {profile.interests.length > 0 && (
          <View style={styles.wrap}>
            {profile.interests.map((interest) => (
              <Badge key={interest} label={interest} />
            ))}
          </View>
        )}
        {profile.biography && <AppText variant="bodySmall">{profile.biography}</AppText>}
        <AppText variant="bodySmall" tone="mutedForeground">
          {[profile.contactEmail, profile.phoneNumber ? formatPhone(profile.phoneNumber) : null].filter(Boolean).join(" · ") || t("profile.notAdded")}
        </AppText>
        <Button label={t("profile.editBasics")} variant="outline" icon="edit-2" onPress={() => router.push("/profile/edit")} fullWidth />
      </Card>

      <View style={styles.buttons}>
        <Button label={t("nav.skillPassport")} variant="secondary" icon="award" onPress={() => router.push("/skill-passport")} fullWidth />
        <Button label={t("nav.privacy")} variant="secondary" icon="lock" onPress={() => router.push("/profile/privacy")} fullWidth />
      </View>

      <Card>
        <CardHeader title={t("availability.title")} action={<Badge tone={a.status === "NOT_LOOKING" ? "neutral" : "success"} label={t(`availability.statuses.${a.status}`)} />} />
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("availability.workModes")}: {a.workModes.length ? a.workModes.map((m) => t(`workMode.${m}`)).join(", ") : t("availability.none")}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("availability.employmentTypes")}: {a.employmentTypes.length ? a.employmentTypes.map((e) => t(`employmentType.${e}`)).join(", ") : t("availability.none")}
        </AppText>
        <Button label={t("availability.edit")} variant="outline" onPress={() => router.push("/profile/availability")} fullWidth />
      </Card>

      <Section title={t("experiences.title")} addLabel={t("experiences.add")} onAdd={() => edit("experiences")} empty={t("experiences.empty")} isEmpty={profile.experiences.length === 0}>
        {profile.experiences.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row
              title={item.title}
              lines={[`${item.companyName}${item.employmentType ? ` · ${t(`employmentType.${item.employmentType}`)}` : ""}`, range(item.startDate, item.endDate, item.isCurrent), item.location]}
              onPress={() => edit("experiences", item.id)}
            />
          </View>
        ))}
      </Section>

      <Section title={t("education.title")} addLabel={t("education.add")} onAdd={() => edit("education")} empty={t("education.empty")} isEmpty={profile.education.length === 0}>
        {profile.education.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row title={item.institution} lines={[[item.degree, item.fieldOfStudy].filter(Boolean).join(", "), range(item.startDate, item.endDate)]} onPress={() => edit("education", item.id)} />
          </View>
        ))}
      </Section>

      <Section title={t("certificates.title")} addLabel={t("certificates.add")} onAdd={() => edit("certificates")} empty={t("certificates.empty")} isEmpty={profile.certificates.length === 0}>
        {profile.certificates.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row
              title={item.name}
              badge={item.expiresOn !== null && item.expiresOn < today ? <Badge tone="warning" label={t("certificates.expired")} /> : undefined}
              lines={[item.issuer, range(item.issuedOn, item.expiresOn)]}
              onPress={() => edit("certificates", item.id)}
            />
          </View>
        ))}
      </Section>

      <Section title={t("portfolio.title")} addLabel={t("portfolio.add")} onAdd={() => edit("portfolio")} empty={t("portfolio.empty")} isEmpty={profile.portfolio.length === 0}>
        {profile.portfolio.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row
              title={item.title}
              badge={item.isVisible ? undefined : <Badge label={t("portfolio.onlyYou")} />}
              lines={[item.technologies.join(", "), month(item.completedOn)]}
              onPress={() => edit("portfolio", item.id)}
            />
          </View>
        ))}
      </Section>

      <Section title={t("languages.title")} addLabel={t("languages.add")} onAdd={() => edit("languages")} empty={t("languages.empty")} isEmpty={profile.languages.length === 0}>
        {profile.languages.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row title={languageName(item.languageCode)} lines={[t(`languages.levels.${item.proficiency}`)]} onPress={() => edit("languages", item.id)} />
          </View>
        ))}
      </Section>

      <Button label={t("profile.deleteProfile")} variant="ghost" icon="trash-2" onPress={() => setDeletingProfile(true)} />
      <Modal
        visible={deletingProfile}
        onClose={() => setDeletingProfile(false)}
        dismissible={false}
        title={t("profile.deleteProfileTitle")}
        description={t("profile.deleteProfileBody")}
        footer={
          <>
            {removeProfile.isError && <Alert tone="error" message={errorMessage(t, removeProfile.error)} />}
            <Button label={t("profile.deleteProfile")} variant="destructive" loading={removeProfile.isPending} onPress={() => removeProfile.mutate()} fullWidth />
            <Button label={t("common.cancel")} variant="outline" onPress={() => setDeletingProfile(false)} fullWidth />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing[4] },
  identity: { flexDirection: "row", gap: spacing[4], alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingVertical: spacing[3] },
  rowText: { flex: 1, gap: spacing[0.5] },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[1.5] },
  buttons: { gap: spacing[2] },
});
