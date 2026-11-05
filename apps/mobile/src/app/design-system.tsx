import { colors, radius, spacing, TYPE_STYLES, type ColorTokens } from "@skillprove/shared/design";
import { Redirect } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../components/shell/screen";
import {
  Alert,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PasswordInput,
  Progress,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  Textarea,
} from "../components/ui";
import { usePreferences } from "../theme/preferences-provider";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="h3" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Development builds only: a production build redirects home. */
export default function DesignSystemScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Showcase />;
}

function Showcase() {
  const { t, theme } = usePreferences();
  const ex = t;
  const [email, setEmail] = useState("arta@");
  const [terms, setTerms] = useState(false);
  const [updates, setUpdates] = useState(true);
  const [contact, setContact] = useState<"email" | "phone">("email");
  const [country, setCountry] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "evidence" | "history">("overview");
  const [modal, setModal] = useState<"dialog" | "confirm" | null>(null);
  const palette = colors[theme];

  return (
    <Screen showBack>
      <AppText variant="display" accessibilityRole="header">
        {t("designSystem.title")}
      </AppText>
      <AppText tone="mutedForeground">{t("designSystem.description")}</AppText>

      <Section title={t("designSystem.colors")}>
        <View style={styles.swatches}>
          {(Object.keys(palette) as (keyof ColorTokens)[]).map((name) => (
            <View key={name} style={styles.swatch}>
              <View style={[styles.chip, { backgroundColor: palette[name], borderColor: palette.border }]} />
              <AppText variant="caption" numberOfLines={1} style={styles.flex}>
                {name}
              </AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title={t("designSystem.typography")}>
        {TYPE_STYLES.map((style) => (
          <AppText key={style} variant={style}>
            {style} · {t("designSystem.sampleText")}
          </AppText>
        ))}
      </Section>

      <Section title={`${t("designSystem.spacing")} · ${t("designSystem.radius")}`}>
        <View style={styles.wrap}>
          {[spacing[2], spacing[4], spacing[6], spacing[8], spacing[12]].map((value) => (
            <View key={value} style={{ width: value, height: value, backgroundColor: palette.accent, borderRadius: radius.sm }} />
          ))}
        </View>
        <View style={styles.wrap}>
          {Object.entries(radius).map(([name, value]) => (
            <View key={name} style={[styles.radius, { borderRadius: Math.min(value, 28), backgroundColor: palette.secondary, borderColor: palette.border }]}>
              <AppText variant="caption">{name}</AppText>
            </View>
          ))}
        </View>
      </Section>

      <Section title={t("designSystem.buttons")}>
        <View style={styles.wrap}>
          <Button label={ex("designSystem.examples.primary")} />
          <Button label={ex("designSystem.examples.secondary")} variant="secondary" />
          <Button label={ex("designSystem.examples.outline")} variant="outline" />
          <Button label={ex("designSystem.examples.ghost")} variant="ghost" />
          <Button label={ex("designSystem.examples.destructive")} variant="destructive" />
          <Button label={ex("designSystem.examples.link")} variant="link" />
          <Button label={ex("designSystem.examples.loading")} loading />
          <Button label={ex("designSystem.examples.disabled")} disabled />
          <Button label={ex("designSystem.examples.small")} size="sm" />
          <Button label={ex("designSystem.examples.large")} size="lg" />
          <IconButton label={ex("designSystem.examples.settings")} icon="settings" variant="outline" />
        </View>
      </Section>

      <Section title={t("designSystem.inputs")}>
        <Input
          label={ex("designSystem.examples.emailLabel")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          helperText={ex("designSystem.examples.emailHelper")}
          error={/^\S+@\S+\.\S+$/.test(email) ? undefined : ex("designSystem.examples.emailError")}
        />
        <PasswordInput label={ex("designSystem.examples.passwordLabel")} />
        <Select
          label={ex("designSystem.examples.countryLabel")}
          value={country}
          onChange={setCountry}
          options={[
            { value: "XK", label: ex("designSystem.examples.countryKosovo") },
            { value: "AL", label: ex("designSystem.examples.countryAlbania") },
            { value: "MK", label: ex("designSystem.examples.countryNorthMacedonia") },
          ]}
        />
        <Textarea label={ex("designSystem.examples.bioLabel")} labelHint={t("common.optional")} />
        <Input label={ex("designSystem.examples.disabledLabel")} value="SkillProve" disabled />
      </Section>

      <Section title={t("designSystem.selection")}>
        <Checkbox label={ex("designSystem.examples.termsLabel")} checked={terms} onChange={setTerms} />
        <RadioGroup
          label={ex("designSystem.examples.contactLabel")}
          value={contact}
          onChange={setContact}
          options={[
            { value: "email", label: ex("designSystem.examples.contactEmail") },
            { value: "phone", label: ex("designSystem.examples.contactPhone") },
          ]}
        />
        <Switch label={ex("designSystem.examples.notificationsLabel")} checked={updates} onChange={setUpdates} />
      </Section>

      <Section title={`${t("designSystem.cards")} · ${t("designSystem.badges")} · ${t("designSystem.avatars")}`}>
        <Card>
          <CardHeader
            title={ex("designSystem.examples.cardTitle")}
            description={ex("designSystem.examples.cardDescription")}
            action={<Badge tone="success" label={ex("designSystem.examples.success")} />}
          />
          <AppText tone="mutedForeground">{ex("designSystem.examples.cardBody")}</AppText>
          <Separator />
          <View style={styles.wrap}>
            <Badge label={ex("designSystem.examples.neutral")} />
            <Badge tone="warning" label={ex("designSystem.examples.warning")} />
            <Badge tone="error" label={ex("designSystem.examples.error")} />
            <Badge tone="info" label={ex("designSystem.examples.info")} />
          </View>
          <View style={styles.wrap}>
            <Avatar name={ex("designSystem.examples.sampleName")} size="sm" />
            <Avatar name={ex("designSystem.examples.sampleName")} />
            <Avatar name={ex("designSystem.examples.sampleName")} size="lg" />
          </View>
        </Card>
      </Section>

      <Section title={t("designSystem.overlays")}>
        <View style={styles.wrap}>
          <Button label={ex("designSystem.examples.openDialog")} variant="outline" onPress={() => setModal("dialog")} />
          <Button label={ex("designSystem.examples.openAlertDialog")} variant="destructive" onPress={() => setModal("confirm")} />
        </View>
        <Modal
          visible={modal === "dialog"}
          onClose={() => setModal(null)}
          title={ex("designSystem.examples.dialogTitle")}
          description={ex("designSystem.examples.dialogBody")}
          footer={<Button label={t("common.confirm")} onPress={() => setModal(null)} fullWidth />}
        >
          <Input label={ex("designSystem.examples.emailLabel")} keyboardType="email-address" autoCapitalize="none" />
        </Modal>
        <Modal
          visible={modal === "confirm"}
          onClose={() => setModal(null)}
          dismissible={false}
          title={ex("designSystem.examples.alertDialogTitle")}
          description={ex("designSystem.examples.alertDialogBody")}
          footer={
            <>
              <Button label={ex("designSystem.examples.menuDelete")} variant="destructive" onPress={() => setModal(null)} fullWidth />
              <Button label={t("common.cancel")} variant="outline" onPress={() => setModal(null)} fullWidth />
            </>
          }
        />
      </Section>

      <Section title={t("designSystem.tabs")}>
        <Tabs
          label={t("designSystem.tabs")}
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: ex("designSystem.examples.tabOverview") },
            { value: "evidence", label: ex("designSystem.examples.tabEvidence") },
            { value: "history", label: ex("designSystem.examples.tabHistory") },
          ]}
        />
        <AppText tone="mutedForeground">
          {tab === "overview"
            ? ex("designSystem.examples.tabOverviewBody")
            : tab === "evidence"
              ? ex("designSystem.examples.tabEvidenceBody")
              : ex("designSystem.examples.tabHistoryBody")}
        </AppText>
      </Section>

      <Section title={t("designSystem.alerts")}>
        <Alert tone="info" title={ex("designSystem.examples.alertInfoTitle")} message={ex("designSystem.examples.alertInfoBody")} />
        <Alert tone="success" title={ex("designSystem.examples.alertSuccessTitle")} message={ex("designSystem.examples.alertSuccessBody")} />
        <Alert tone="warning" title={ex("designSystem.examples.alertWarningTitle")} message={ex("designSystem.examples.alertWarningBody")} />
        <Alert tone="error" title={ex("designSystem.examples.alertErrorTitle")} message={ex("designSystem.examples.alertErrorBody")} />
      </Section>

      <Section title={t("designSystem.progress")}>
        <Progress value={64} label={t("components.progress", { value: 64 })} />
        <Spinner />
        <Skeleton width="75%" />
        <Skeleton width="50%" />
      </Section>

      <Section title={t("designSystem.emptyStates")}>
        <EmptyState title={ex("designSystem.examples.emptyTitle")} description={ex("designSystem.examples.emptyBody")} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing[3], paddingTop: spacing[4] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  swatch: { width: "47%", flexDirection: "row", alignItems: "center", gap: spacing[2] },
  chip: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  radius: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
});
