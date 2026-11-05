import { SELF_REPORTED_LEVELS } from "@skillprove/shared";
import { selfReportedSkillInputSchema, selfReportedSkillUpdateSchema, type SelfReportedSkill } from "@skillprove/validation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useDeferredValue, useState } from "react";
import { FormActions } from "../../components/profile/form-actions";
import { useForm } from "../../components/profile/use-form";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Badge, Button, Input, Modal, RadioGroup, Select, Spinner } from "../../components/ui";
import { errorMessage, queryKeys, useApiClient, yearsValue } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

/** Adds a self-reported skill, or edits one when `skillId` is given. Never a score. */
export default function SelfReportedSkillScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <Loader />
      </SignedInGate>
    </Screen>
  );
}

function Loader() {
  const { t, locale } = useI18n();
  const { skillId } = useLocalSearchParams<{ skillId?: string }>();
  const client = useApiClient();
  const passport = useQuery({ queryKey: queryKeys.passport(locale), queryFn: client.getSkillPassport, retry: false });
  if (passport.isPending) return <Spinner />;
  if (passport.isError) return <Alert tone="error" message={errorMessage(t, passport.error)} />;
  const existing = passport.data.selfReported;
  if (!skillId) return <AddSkill existing={new Set(existing.map((s) => s.skill.id))} />;
  const skill = existing.find((s) => s.skill.id === skillId);
  return skill ? <EditSkill skill={skill} /> : <Alert tone="error" message={t("errors.loadFailed")} />;
}

function LevelAndYears({ values, set, error }: { values: { level: string; years: string }; set: (key: "level" | "years", value: string) => void; error: (field: string) => string | undefined }) {
  const { t } = useI18n();
  return (
    <>
      <RadioGroup
        label={t("passport.level")}
        value={SELF_REPORTED_LEVELS.find((level) => level === values.level) ?? "INTERMEDIATE"}
        onChange={(level) => set("level", level)}
        options={SELF_REPORTED_LEVELS.map((level) => ({ value: level, label: t(`passport.levels.${level}`) }))}
      />
      <Input label={t("passport.years")} labelHint={t("common.optional")} helperText={t("passport.yearsHelper")} value={values.years} onChangeText={(v) => set("years", v)} error={error("yearsOfExperience")} keyboardType="decimal-pad" />
    </>
  );
}

function AddSkill({ existing }: { existing: Set<string> }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const results = useInfiniteQuery({
    queryKey: queryKeys.skillSearch(locale, search),
    queryFn: ({ pageParam }) => client.searchSkills({ q: search, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const options = (results.data?.pages.flatMap((page) => page.items) ?? []).filter((skill) => !existing.has(skill.id));
  const form = useForm({
    initial: { skillId: "", level: "INTERMEDIATE", years: "" },
    schema: selfReportedSkillInputSchema,
    toInput: (v) => ({ skillId: v.skillId, level: v.level, yearsOfExperience: yearsValue(v.years) }),
    submit: (input) => client.addSelfReportedSkill(input),
  });

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("passport.addSkill")}
      </AppText>
      <AppText tone="mutedForeground">{t("passport.selfReportedNote")}</AppText>
      <Input label={t("passport.searchSkills")} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      {results.isPending ? (
        <Spinner />
      ) : results.isError ? (
        <Alert tone="error" message={errorMessage(t, results.error)} />
      ) : options.length === 0 ? (
        <AppText variant="bodySmall" tone="mutedForeground">
          {t("passport.noResults")}
        </AppText>
      ) : (
        <Select
          label={t("passport.skill")}
          value={form.values.skillId || null}
          onChange={(v) => form.set("skillId", v)}
          error={form.error("skillId")}
          options={options.map((skill) => ({ value: skill.id, label: `${skill.name} · ${skill.category}` }))}
        />
      )}
      {results.hasNextPage && <Button label={t("common.showMore")} variant="ghost" loading={results.isFetchingNextPage} onPress={() => void results.fetchNextPage()} />}
      <LevelAndYears values={form.values} set={(key, value) => form.set(key, value)} error={form.error} />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}

function EditSkill({ skill }: { skill: SelfReportedSkill }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const form = useForm({
    initial: { level: String(skill.level), years: skill.yearsOfExperience === null ? "" : String(skill.yearsOfExperience) },
    schema: selfReportedSkillUpdateSchema,
    toInput: (v) => ({ level: v.level, yearsOfExperience: yearsValue(v.years), expectedUpdatedAt: skill.updatedAt }),
    submit: (input) => client.updateSelfReportedSkill(skill.skill.id, input),
  });
  const remove = useMutation({
    mutationFn: () => client.removeSelfReportedSkill(skill.skill.id),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.passport(locale) });
      router.back();
    },
  });

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("passport.editSkill")}
      </AppText>
      <AppText variant="h4">{skill.skill.name}</AppText>
      <Badge label={t("passport.selfReported")} />
      <LevelAndYears values={form.values} set={(key, value) => form.set(key, value)} error={form.error} />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
      <Button label={t("common.remove")} variant="ghost" icon="trash-2" onPress={() => setConfirming(true)} />
      <Modal
        visible={confirming}
        onClose={() => setConfirming(false)}
        dismissible={false}
        title={t("passport.removeSkillTitle")}
        description={skill.skill.name}
        footer={
          <>
            {remove.isError && <Alert tone="error" message={errorMessage(t, remove.error)} />}
            <Button label={t("common.remove")} variant="destructive" loading={remove.isPending} onPress={() => remove.mutate()} fullWidth />
            <Button label={t("common.cancel")} variant="outline" onPress={() => setConfirming(false)} fullWidth />
          </>
        }
      />
    </>
  );
}
