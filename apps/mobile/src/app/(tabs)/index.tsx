import { Feather } from "@expo/vector-icons";
import { availableCount, continueAttempt, passportSkillCount, profileCompleteness, recentActivity, topVerifiedSkills, type ActivityKind, type ProfileCompletenessItem } from "@skillprove/shared";
import { radius, spacing } from "@skillprove/shared/design";
import { formatDate, formatNumber } from "@skillprove/shared/i18n";
import { useQuery } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { MedalFor } from "../../components/medal-for";
import { QueryState } from "../../components/query-state";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { AppText, Badge, Button, Card, CardHeader, EmptyState, HeroCard, Progress, SkillRow, StatCard } from "../../components/ui";
import { queryKeys, useApiClient } from "../../lib/use-api";
import { usePreferences } from "../../theme/preferences-provider";

export default function HomeScreen() {
  return (
    <Screen>
      <SignedInGate>
        <Home />
      </SignedInGate>
    </Screen>
  );
}

/** Where each missing profile item is added on the phone. */
const COMPLETENESS_ROUTES: Record<ProfileCompletenessItem, Href> = {
  profile: "/profile/edit",
  headline: "/profile/edit",
  biography: "/profile/edit",
  location: "/profile/edit",
  skills: "/profile/skill",
  experience: { pathname: "/profile/item", params: { section: "experiences" } },
  education: { pathname: "/profile/item", params: { section: "education" } },
  languages: { pathname: "/profile/item", params: { section: "languages" } },
  preferences: "/profile/availability",
};

/**
 * The candidate home on the phone, matching the web home: greeting, a hero card (the attempt in
 * progress, or the way into the assessments), real numbers, the Skill Passport, completeness and
 * recent activity. Same shared rules as the web, so both show the same thing.
 */
function Home() {
  const { t, locale, colors } = usePreferences();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });
  const takeable = useQuery({ queryKey: queryKeys.takeable(locale), queryFn: client.listTakeableAssessments, retry: false });

  const firstName = profile.data?.fullName.trim().split(/\s+/)[0];
  const skillCount = passport.data ? passportSkillCount(passport.data) : 0;
  const completeness = profile.isSuccess && passport.isSuccess ? profileCompleteness(profile.data, skillCount) : null;

  return (
    <>
      <View style={styles.greeting}>
        <AppText variant="h1" accessibilityRole="header">
          {firstName ? t("home.greeting", { name: firstName }) : t("home.greetingNoName")}
        </AppText>
        <AppText tone="mutedForeground">{t("home.subtitle")}</AppText>
      </View>

      {!takeable.isSuccess ? (
        <QueryState query={takeable} skeleton={[150]} />
      ) : (
        (() => {
          const open = continueAttempt(takeable.data.items);
          if (open) {
            return (
              <HeroCard
                title={t("home.continueTitle")}
                body={t("home.continueBody", { title: open.title })}
                action={<Button label={t("home.continueAction")} variant="glow" onPress={() => router.push({ pathname: "/take/attempt", params: { attemptId: open.attemptId } })} />}
              />
            );
          }
          const count = availableCount(takeable.data.items);
          return (
            <HeroCard
              title={t("home.takeTitle")}
              body={count === 0 ? t("home.takeEmpty") : count === 1 ? t("home.availableOne") : t("home.availableMany", { count: formatNumber(locale, count) })}
              action={<Button label={t("home.takeAction")} variant="glow" onPress={() => router.push("/take")} />}
            />
          );
        })()
      )}

      <View style={styles.stats}>
        {passport.isSuccess ? <StatCard icon="check-circle" value={formatNumber(locale, passport.data.verified.length)} label={t("home.statVerified")} /> : <View style={styles.flex}><QueryState query={passport} skeleton={[110]} /></View>}
        {completeness ? (
          <StatCard icon="user" value={formatNumber(locale, completeness.percent / 100, { style: "percent" })} label={t("home.statComplete")} />
        ) : (
          <View style={styles.flex}>
            <QueryState query={profile.isSuccess ? passport : profile} skeleton={[110]} />
          </View>
        )}
      </View>

      <Card style={styles.listCard}>
        <View style={styles.cardPad}>
          <CardHeader title={t("home.passportTitle")} action={<Button label={t("home.viewAll")} variant="link" onPress={() => router.push("/skill-passport")} />} />
        </View>
        {!passport.isSuccess ? (
          <View style={styles.cardPad}>
            <QueryState query={passport} skeleton={[56, 56]} />
          </View>
        ) : topVerifiedSkills(passport.data).length === 0 ? (
          <View style={styles.cardPad}>
            <EmptyState icon="award" title={t("home.passportEmpty")} action={<Button label={t("home.takeAction")} size="sm" onPress={() => router.push("/take")} />} />
          </View>
        ) : (
          topVerifiedSkills(passport.data).map((s) => (
            <SkillRow
              key={s.skillId}
              icon="check-circle"
              title={s.name}
              detail={`${t("passport.scoreOutOf", { score: formatNumber(locale, s.score, { maximumFractionDigits: 1 }) })} · ${s.level ? t(`passport.levels.${s.level}`) : t("passport.moreAssessmentsNeeded")}`}
              medal={<MedalFor medal={s.medal} outdated={s.outdated} />}
              badge={<Badge tone="success" label={t("passport.verified")} />}
              onPress={() => router.push("/skill-passport")}
            />
          ))
        )}
      </Card>

      <Card>
        <CardHeader title={t("completeness.title")} />
        {completeness ? (
          <View style={styles.gap}>
            <Progress value={completeness.percent} label={t("completeness.percent", { percent: completeness.percent })} />
            <AppText variant="label">{t("completeness.percent", { percent: completeness.percent })}</AppText>
            {completeness.next ? (
              <Button label={t(`completeness.items.${completeness.next}`)} variant="outline" onPress={() => router.push(COMPLETENESS_ROUTES[completeness.next!])} />
            ) : (
              <AppText tone="success">{t("completeness.complete")}</AppText>
            )}
          </View>
        ) : (
          <QueryState query={profile.isSuccess ? passport : profile} skeleton={[48]} />
        )}
      </Card>

      <Card>
        <CardHeader title={t("home.activityTitle")} />
        {!passport.isSuccess ? (
          <QueryState query={passport} skeleton={[48, 48]} />
        ) : recentActivity(passport.data).length === 0 ? (
          <EmptyState icon="inbox" title={t("home.activityEmpty")} />
        ) : (
          recentActivity(passport.data).map((item) => (
            <View key={item.id} style={styles.activity} accessible accessibilityLabel={`${t(`home.activity.${item.kind}`, { title: item.title })}, ${formatDate(locale, new Date(item.at))}`}>
              <View style={[styles.activityIcon, { backgroundColor: ACTIVITY_TONE[item.kind](colors) }]}>
                <Feather name={item.kind === "verified" ? "check-circle" : "clipboard"} size={16} color={item.kind === "verified" ? colors.success : colors.primary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="label">{t(`home.activity.${item.kind}`, { title: item.title })}</AppText>
                <AppText variant="caption" tone="mutedForeground">
                  {formatDate(locale, new Date(item.at))}
                </AppText>
              </View>
            </View>
          ))
        )}
      </Card>
    </>
  );
}

const ACTIVITY_TONE: Record<ActivityKind, (c: ReturnType<typeof usePreferences>["colors"]) => string> = {
  verified: (c) => c.successSubtle,
  submitted: (c) => c.infoSubtle,
  started: (c) => c.secondary,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing[3] },
  greeting: { gap: spacing[1] },
  stats: { flexDirection: "row", gap: spacing[3] },
  listCard: { paddingHorizontal: spacing[2], gap: 0 },
  cardPad: { paddingHorizontal: spacing[3], paddingBottom: spacing[2] },
  activity: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  activityIcon: { width: 32, height: 32, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
