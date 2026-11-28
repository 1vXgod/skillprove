import { PROFILE_COUNTRY_CODES, PROFILE_LANGUAGE_CODES, todayInKosovo, type ProfileSection } from "@skillprove/shared";
import { formatDate, formatNumber, formatPhone } from "@skillprove/shared/i18n";
import type { OwnProfile } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Avatar, Badge, Button, Card, CardHeader, Chip, EmptyState, GradientPanel, IconTile, Modal, Separator, type IconName } from "../../components/ui";
import { ProfileStats } from "../../components/profile-stats";
import { QueryState } from "../../components/query-state";
import { VerifiedSkillsSection } from "../../components/verified-skills-section";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n, useTheme } from "../../theme/preferences-provider";
import { controlHeights, radius, spacing } from "@skillprove/shared/design";

export default function ProfileScreen() {
  return (
    <Screen settings>
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

/** A card heading with an icon tile, an optional count and one action. */
function SectionHeading({ icon, title, count, action }: { icon: IconName; title: string; count?: number; action?: ReactNode }) {
  const { locale } = useI18n();
  return (
    <View style={styles.heading}>
      <IconTile icon={icon} size="sm" />
      <View style={[styles.flex, styles.inline]}>
        <AppText variant="h4" accessibilityRole="header">
          {title}
        </AppText>
        {count !== undefined && count > 0 && (
          <AppText variant="bodySmall" tone="mutedForeground">
            {formatNumber(locale, count)}
          </AppText>
        )}
      </View>
      {action}
    </View>
  );
}

/** One entry; tapping it opens the editor. On a timeline a dot and a line join the entries. */
function Row({ title, lines, onPress, badge, timeline = false, last = false }: { title: string; lines: (string | null | undefined)[]; onPress: () => void; badge?: ReactNode; timeline?: boolean; last?: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("common.edit")}: ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
    >
      {timeline && (
        <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.dot, { borderColor: colors.primary, backgroundColor: colors.surface }]} />
          {!last && <View style={[styles.line, { backgroundColor: colors.border }]} />}
        </View>
      )}
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
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function Section({ icon, title, addLabel, onAdd, empty, count, children }: { icon: IconName; title: string; addLabel: string; onAdd: () => void; empty: string; count: number; children: ReactNode }) {
  return (
    <Card>
      <SectionHeading icon={icon} title={title} count={count} action={<Button label={addLabel} variant="outline" size="sm" icon="plus" onPress={onAdd} accessibilityLabel={addLabel} />} />
      {count === 0 ? <EmptyState title={empty} /> : <View>{children}</View>}
    </Card>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.muted }]}>
      <IconTile icon={icon} size="sm" />
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ContactRow({ icon, label, value }: { icon: IconName; label: string; value: string | null }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={styles.contact}>
      <Feather name={icon} size={16} color={colors.mutedForeground} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={styles.flex}>
        <AppText variant="caption" tone="mutedForeground">
          {label}
        </AppText>
        <AppText variant="bodySmall" tone={value ? "foreground" : "mutedForeground"}>
          {value ?? t("profile.notAdded")}
        </AppText>
      </View>
    </View>
  );
}

function ProfileDetails({ profile }: { profile: OwnProfile }) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
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
  const location = [profile.city, country ? t(`profile.countries.${country}`) : profile.countryCode].filter(Boolean).join(", ");
  const languageName = (code: string) => {
    const known = PROFILE_LANGUAGE_CODES.find((c) => c === code);
    return known ? t(`languages.names.${known}`) : code;
  };
  const today = todayInKosovo();
  const a = profile.availability;
  const links = [
    { label: t("profile.linkedinUrl"), url: profile.linkedinUrl },
    { label: t("profile.githubUrl"), url: profile.githubUrl },
    { label: t("profile.websiteUrl"), url: profile.websiteUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return (
    <View style={styles.gap}>
      <AppText variant="h1" accessibilityRole="header">
        {t("profile.title")}
      </AppText>

      <GradientPanel>
        <View style={styles.hero}>
          <View style={styles.identity}>
            <Avatar name={profile.fullName} size="lg" />
            <View style={styles.rowText}>
              <AppText variant="h3" style={{ color: colors.sidebarForeground }}>
                {profile.fullName}
              </AppText>
              {profile.headline && <AppText style={{ color: colors.sidebarMuted }}>{profile.headline}</AppText>}
              {location !== "" && (
                <View style={styles.inline}>
                  <Feather name="map-pin" size={14} color={colors.sidebarMuted} accessibilityElementsHidden importantForAccessibility="no" />
                  <AppText variant="bodySmall" style={{ color: colors.sidebarMuted }}>
                    {location}
                  </AppText>
                </View>
              )}
            </View>
          </View>
          <View style={styles.wrap}>
            <Chip inverse icon="briefcase" label={t(`availability.statuses.${a.status}`)} />
            {a.workModes.map((m) => (
              <Chip key={m} inverse label={t(`workMode.${m}`)} />
            ))}
            <Chip inverse icon="eye" label={t("profile.visibilityChip", { who: t(`privacy.visibilities.${profile.privacy.visibility}`) })} />
          </View>
          <AppText variant="caption" style={{ color: colors.sidebarMuted }}>
            {t("profile.photoUnavailable")}
          </AppText>
          <Button label={t("profile.editBasics")} variant="secondary" icon="edit-2" onPress={() => router.push("/profile/edit")} fullWidth />
        </View>
      </GradientPanel>

      <ProfileStats profile={profile} />

      <Card style={styles.links}>
        <LinkRow icon="award" label={t("nav.skillPassport")} onPress={() => router.push("/skill-passport")} />
        <Separator />
        <LinkRow icon="lock" label={t("nav.privacy")} onPress={() => router.push("/profile/privacy")} />
      </Card>

      <VerifiedSkillsSection shownToCompanies={profile.privacy.showVerifiedSkills} />

      <Card>
        <SectionHeading icon="user" title={t("profile.biography")} />
        <AppText variant="bodySmall" tone={profile.biography ? "foreground" : "mutedForeground"}>
          {profile.biography ?? t("profile.notAdded")}
        </AppText>
        <AppText variant="caption" tone="mutedForeground">
          {t("profile.interests")}
        </AppText>
        {profile.interests.length > 0 ? (
          <View style={styles.wrap}>
            {profile.interests.map((interest) => (
              <Chip key={interest} label={interest} />
            ))}
          </View>
        ) : (
          <AppText variant="bodySmall" tone="mutedForeground">
            {t("profile.noInterests")}
          </AppText>
        )}
      </Card>

      <Card>
        <SectionHeading icon="mail" title={t("profile.contact")} />
        <ContactRow icon="mail" label={t("profile.contactEmail")} value={profile.contactEmail} />
        <ContactRow icon="phone" label={t("profile.phoneNumber")} value={profile.phoneNumber ? formatPhone(profile.phoneNumber) : null} />
        {links.map((link) => (
          <ContactRow key={link.url} icon="link" label={link.label} value={link.url} />
        ))}
      </Card>

      <Card>
        <SectionHeading
          icon="clock"
          title={t("availability.title")}
          action={<Button label={t("common.edit")} variant="outline" size="sm" icon="edit-2" onPress={() => router.push("/profile/availability")} accessibilityLabel={t("availability.edit")} />}
        />
        <View>
          <Badge tone={a.status === "NOT_LOOKING" ? "neutral" : "success"} label={t(`availability.statuses.${a.status}`)} />
        </View>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("availability.workModes")}: {a.workModes.length ? a.workModes.map((m) => t(`workMode.${m}`)).join(", ") : t("availability.none")}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("availability.employmentTypes")}: {a.employmentTypes.length ? a.employmentTypes.map((e) => t(`employmentType.${e}`)).join(", ") : t("availability.none")}
        </AppText>
      </Card>

      <Section icon="briefcase" title={t("experiences.title")} addLabel={t("experiences.add")} onAdd={() => edit("experiences")} empty={t("experiences.empty")} count={profile.experiences.length}>
        {profile.experiences.map((item, index) => (
          <Row
            key={item.id}
            timeline
            last={index === profile.experiences.length - 1}
            title={item.title}
            lines={[`${item.companyName}${item.employmentType ? ` · ${t(`employmentType.${item.employmentType}`)}` : ""}`, range(item.startDate, item.endDate, item.isCurrent), item.location]}
            onPress={() => edit("experiences", item.id)}
          />
        ))}
      </Section>

      <Section icon="book-open" title={t("education.title")} addLabel={t("education.add")} onAdd={() => edit("education")} empty={t("education.empty")} count={profile.education.length}>
        {profile.education.map((item, index) => (
          <Row
            key={item.id}
            timeline
            last={index === profile.education.length - 1}
            title={item.institution}
            lines={[[item.degree, item.fieldOfStudy].filter(Boolean).join(", "), range(item.startDate, item.endDate)]}
            onPress={() => edit("education", item.id)}
          />
        ))}
      </Section>

      <Section icon="file-text" title={t("certificates.title")} addLabel={t("certificates.add")} onAdd={() => edit("certificates")} empty={t("certificates.empty")} count={profile.certificates.length}>
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

      <Section icon="folder" title={t("portfolio.title")} addLabel={t("portfolio.add")} onAdd={() => edit("portfolio")} empty={t("portfolio.empty")} count={profile.portfolio.length}>
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

      <Section icon="globe" title={t("languages.title")} addLabel={t("languages.add")} onAdd={() => edit("languages")} empty={t("languages.empty")} count={profile.languages.length}>
        {profile.languages.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <Separator />}
            <Row title={languageName(item.languageCode)} lines={[t(`languages.levels.${item.proficiency}`)]} onPress={() => edit("languages", item.id)} />
          </View>
        ))}
      </Section>

      <Card style={{ borderColor: colors.destructive }}>
        <AppText variant="h4" accessibilityRole="header" style={{ color: colors.destructive }}>
          {t("profile.dangerZone")}
        </AppText>
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("profile.deleteProfileBody")}
        </AppText>
        <Button label={t("profile.deleteProfile")} variant="outline" icon="trash-2" onPress={() => setDeletingProfile(true)} fullWidth />
      </Card>
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
  flex: { flex: 1 },
  hero: { gap: spacing[4], padding: spacing[5] },
  identity: { flexDirection: "row", gap: spacing[4], alignItems: "center" },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], paddingVertical: spacing[3], borderRadius: radius.md },
  rowText: { flex: 1, gap: spacing[0.5] },
  rail: { width: spacing[3], alignItems: "center", alignSelf: "stretch" },
  dot: { width: spacing[3], height: spacing[3], borderRadius: radius.full, borderWidth: 2, marginTop: spacing[1] },
  line: { position: "absolute", top: spacing[5], bottom: -spacing[3], width: StyleSheet.hairlineWidth },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  links: { gap: 0, paddingVertical: spacing[2] },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: controlHeights.touch, paddingVertical: spacing[2], borderRadius: radius.md },
  contact: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
});
