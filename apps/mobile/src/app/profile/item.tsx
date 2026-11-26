import { EMPLOYMENT_TYPES, LANGUAGE_PROFICIENCIES, PROFILE_LANGUAGE_CODES, PROFILE_SECTIONS, type ProfileSection } from "@skillprove/shared";
import {
  certificateInputSchema,
  educationInputSchema,
  experienceInputSchema,
  languageInputSchema,
  portfolioInputSchema,
  sectionUpdateSchemas,
  type Certificate,
  type Education,
  type Experience,
  type Language,
  type OwnProfile,
  type PortfolioItem,
} from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FormActions } from "../../components/profile/form-actions";
import { QueryState } from "../../components/query-state";
import { useForm } from "../../components/profile/use-form";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { Alert, AppText, Button, Checkbox, Input, Modal, Select, Switch, Textarea } from "../../components/ui";
import { errorMessage, joinList, orNull, queryKeys, splitList, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

export default function ProfileItemScreen() {
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
  const params = useLocalSearchParams<{ section?: string; id?: string }>();
  const section = PROFILE_SECTIONS.find((name) => name === params.section);
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });

  if (!section) return <Alert tone="error" message={t("errors.loadFailed")} />;
  if (!profile.isSuccess) return <QueryState query={profile} />;
  if (!profile.data) return <AppText tone="mutedForeground">{t("profile.createDescription")}</AppText>;
  const item = params.id ? findItem(profile.data, section, params.id) : null;
  if (params.id && !item) return <Alert tone="error" message={t("errors.loadFailed")} />;
  return <ItemForm section={section} item={item} profile={profile.data} />;
}

type AnyItem = Experience | Education | Certificate | PortfolioItem | Language;

/** Only items on the user's own profile can be found, so an ID from elsewhere opens nothing. */
function findItem(profile: OwnProfile, section: ProfileSection, id: string): AnyItem | null {
  const lists: Record<ProfileSection, AnyItem[]> = {
    experiences: profile.experiences,
    education: profile.education,
    certificates: profile.certificates,
    portfolio: profile.portfolio,
    languages: profile.languages,
  };
  return lists[section].find((entry) => entry.id === id) ?? null;
}

const TITLES = {
  experiences: { add: "experiences.add", edit: "experiences.edit", delete: "experiences.deleteTitle" },
  education: { add: "education.add", edit: "education.edit", delete: "education.deleteTitle" },
  certificates: { add: "certificates.add", edit: "certificates.edit", delete: "certificates.deleteTitle" },
  portfolio: { add: "portfolio.add", edit: "portfolio.edit", delete: "portfolio.deleteTitle" },
  languages: { add: "languages.add", edit: "languages.edit", delete: "languages.deleteTitle" },
} as const;

function ItemForm({ section, item, profile }: { section: ProfileSection; item: AnyItem | null; profile: OwnProfile }) {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => client.sections[section].remove(item?.id ?? ""),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
      router.back();
    },
  });

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t(item ? TITLES[section].edit : TITLES[section].add)}
      </AppText>
      {section === "experiences" && <ExperienceForm item={item && "companyName" in item ? item : null} />}
      {section === "education" && <EducationForm item={item && "institution" in item ? item : null} />}
      {section === "certificates" && <CertificateForm item={item && "credentialUrl" in item ? item : null} />}
      {section === "portfolio" && <PortfolioForm item={item && "technologies" in item ? item : null} />}
      {section === "languages" && <LanguageForm item={item && "languageCode" in item ? item : null} existing={profile.languages.map((l) => l.languageCode)} />}
      {item && <Button label={t("common.delete")} variant="ghost" icon="trash-2" onPress={() => setConfirming(true)} />}
      <Modal
        visible={confirming}
        onClose={() => setConfirming(false)}
        dismissible={false}
        title={t(TITLES[section].delete)}
        description={t("common.cannotUndo")}
        footer={
          <>
            {remove.isError && <Alert tone="error" message={errorMessage(t, remove.error)} />}
            <Button label={t("common.delete")} variant="destructive" loading={remove.isPending} onPress={() => remove.mutate()} fullWidth />
            <Button label={t("common.cancel")} variant="outline" onPress={() => setConfirming(false)} fullWidth />
          </>
        }
      />
    </>
  );
}

function DateInput({ label, value, onChange, error, helperText, optional = true, disabled }: { label: string; value: string; onChange: (v: string) => void; error?: string; helperText?: string; optional?: boolean; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <Input
      label={label}
      labelHint={optional ? t("common.optional") : undefined}
      helperText={helperText}
      placeholder={t("common.dateFormat")}
      value={value}
      onChangeText={onChange}
      error={error}
      disabled={disabled}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
    />
  );
}

function ExperienceForm({ item }: { item: Experience | null }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = {
    title: item?.title ?? "",
    companyName: item?.companyName ?? "",
    employmentType: item?.employmentType ?? "",
    location: item?.location ?? "",
    description: item?.description ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
    isCurrent: item?.isCurrent ?? false,
  };
  const toInput = (v: typeof initial) => ({ ...v, employmentType: EMPLOYMENT_TYPES.find((type) => type === v.employmentType) ?? null, endDate: v.isCurrent ? null : orNull(v.endDate) });
  const add = useForm({ initial, schema: experienceInputSchema, toInput, submit: (input) => client.sections.experiences.add(input) });
  const edit = useForm({
    initial,
    schema: sectionUpdateSchemas.experiences,
    toInput: (v) => ({ ...toInput(v), expectedUpdatedAt: item?.updatedAt ?? "" }),
    submit: (input) => client.sections.experiences.update(item?.id ?? "", input),
  });
  const form = item ? edit : add;
  const { values, set, error } = form;
  return (
    <>
      <Input label={t("experiences.jobTitle")} value={values.title} onChangeText={(v) => set("title", v)} error={error("title")} textContentType="jobTitle" />
      <Input label={t("experiences.company")} value={values.companyName} onChangeText={(v) => set("companyName", v)} error={error("companyName")} textContentType="organizationName" />
      <Select
        label={t("experiences.employmentType")}
        labelHint={t("common.optional")}
        value={values.employmentType || null}
        onChange={(v) => set("employmentType", v)}
        options={EMPLOYMENT_TYPES.map((type) => ({ value: type, label: t(`employmentType.${type}`) }))}
      />
      <Input label={t("experiences.location")} labelHint={t("common.optional")} value={values.location} onChangeText={(v) => set("location", v)} error={error("location")} />
      <DateInput label={t("experiences.startDate")} optional={false} value={values.startDate} onChange={(v) => set("startDate", v)} error={error("startDate")} />
      <Checkbox label={t("experiences.isCurrent")} checked={values.isCurrent} onChange={(on) => set("isCurrent", on)} />
      <DateInput label={t("experiences.endDate")} optional={false} value={values.isCurrent ? "" : values.endDate} disabled={values.isCurrent} onChange={(v) => set("endDate", v)} error={error("endDate")} />
      <Textarea label={t("experiences.description")} labelHint={t("common.optional")} value={values.description} onChangeText={(v) => set("description", v)} error={error("description")} />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}

function EducationForm({ item }: { item: Education | null }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = {
    institution: item?.institution ?? "",
    degree: item?.degree ?? "",
    fieldOfStudy: item?.fieldOfStudy ?? "",
    description: item?.description ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
  };
  const toInput = (v: typeof initial) => ({ ...v, startDate: orNull(v.startDate), endDate: orNull(v.endDate) });
  const add = useForm({ initial, schema: educationInputSchema, toInput, submit: (input) => client.sections.education.add(input) });
  const edit = useForm({
    initial,
    schema: sectionUpdateSchemas.education,
    toInput: (v) => ({ ...toInput(v), expectedUpdatedAt: item?.updatedAt ?? "" }),
    submit: (input) => client.sections.education.update(item?.id ?? "", input),
  });
  const form = item ? edit : add;
  const { values, set, error } = form;
  return (
    <>
      <Input label={t("education.institution")} value={values.institution} onChangeText={(v) => set("institution", v)} error={error("institution")} />
      <Input label={t("education.degree")} labelHint={t("common.optional")} value={values.degree} onChangeText={(v) => set("degree", v)} error={error("degree")} />
      <Input label={t("education.fieldOfStudy")} labelHint={t("common.optional")} value={values.fieldOfStudy} onChangeText={(v) => set("fieldOfStudy", v)} error={error("fieldOfStudy")} />
      <DateInput label={t("education.startDate")} value={values.startDate} onChange={(v) => set("startDate", v)} error={error("startDate")} />
      <DateInput label={t("education.endDate")} helperText={t("education.endDateHelper")} value={values.endDate} onChange={(v) => set("endDate", v)} error={error("endDate")} />
      <Textarea label={t("education.description")} labelHint={t("common.optional")} value={values.description} onChangeText={(v) => set("description", v)} error={error("description")} />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}

function CertificateForm({ item }: { item: Certificate | null }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = {
    name: item?.name ?? "",
    issuer: item?.issuer ?? "",
    credentialId: item?.credentialId ?? "",
    credentialUrl: item?.credentialUrl ?? "",
    issuedOn: item?.issuedOn ?? "",
    expiresOn: item?.expiresOn ?? "",
  };
  const toInput = (v: typeof initial) => ({ ...v, issuedOn: orNull(v.issuedOn), expiresOn: orNull(v.expiresOn) });
  const add = useForm({ initial, schema: certificateInputSchema, toInput, submit: (input) => client.sections.certificates.add(input) });
  const edit = useForm({
    initial,
    schema: sectionUpdateSchemas.certificates,
    toInput: (v) => ({ ...toInput(v), expectedUpdatedAt: item?.updatedAt ?? "" }),
    submit: (input) => client.sections.certificates.update(item?.id ?? "", input),
  });
  const form = item ? edit : add;
  const { values, set, error } = form;
  return (
    <>
      <Input label={t("certificates.name")} value={values.name} onChangeText={(v) => set("name", v)} error={error("name")} />
      <Input label={t("certificates.issuer")} labelHint={t("common.optional")} value={values.issuer} onChangeText={(v) => set("issuer", v)} error={error("issuer")} />
      <Input label={t("certificates.credentialId")} labelHint={t("common.optional")} value={values.credentialId} onChangeText={(v) => set("credentialId", v)} error={error("credentialId")} autoCapitalize="none" />
      <Input label={t("certificates.credentialUrl")} labelHint={t("common.optional")} value={values.credentialUrl} onChangeText={(v) => set("credentialUrl", v)} error={error("credentialUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <DateInput label={t("certificates.issuedOn")} value={values.issuedOn} onChange={(v) => set("issuedOn", v)} error={error("issuedOn")} />
      <DateInput label={t("certificates.expiresOn")} value={values.expiresOn} onChange={(v) => set("expiresOn", v)} error={error("expiresOn")} />
      <AppText variant="bodySmall" tone="mutedForeground">
        {t("profile.documentsUnavailable")}
      </AppText>
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}

function PortfolioForm({ item }: { item: PortfolioItem | null }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = {
    title: item?.title ?? "",
    description: item?.description ?? "",
    technologies: joinList(item?.technologies ?? []),
    projectUrl: item?.projectUrl ?? "",
    repositoryUrl: item?.repositoryUrl ?? "",
    completedOn: item?.completedOn ?? "",
    isVisible: item?.isVisible ?? false,
  };
  const toInput = (v: typeof initial) => ({ ...v, technologies: splitList(v.technologies), completedOn: orNull(v.completedOn) });
  const add = useForm({ initial, schema: portfolioInputSchema, toInput, submit: (input) => client.sections.portfolio.add(input) });
  const edit = useForm({
    initial,
    schema: sectionUpdateSchemas.portfolio,
    toInput: (v) => ({ ...toInput(v), expectedUpdatedAt: item?.updatedAt ?? "" }),
    submit: (input) => client.sections.portfolio.update(item?.id ?? "", input),
  });
  const form = item ? edit : add;
  const { values, set, error } = form;
  return (
    <>
      <Input label={t("portfolio.projectTitle")} value={values.title} onChangeText={(v) => set("title", v)} error={error("title")} />
      <Textarea label={t("portfolio.description")} labelHint={t("common.optional")} value={values.description} onChangeText={(v) => set("description", v)} error={error("description")} />
      <Input label={t("portfolio.technologies")} labelHint={t("common.optional")} helperText={t("portfolio.technologiesHelper")} value={values.technologies} onChangeText={(v) => set("technologies", v)} error={error("technologies")} autoCapitalize="none" />
      <Input label={t("portfolio.projectUrl")} labelHint={t("common.optional")} value={values.projectUrl} onChangeText={(v) => set("projectUrl", v)} error={error("projectUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <Input label={t("portfolio.repositoryUrl")} labelHint={t("common.optional")} value={values.repositoryUrl} onChangeText={(v) => set("repositoryUrl", v)} error={error("repositoryUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <DateInput label={t("portfolio.completedOn")} value={values.completedOn} onChange={(v) => set("completedOn", v)} error={error("completedOn")} />
      <Switch label={t("portfolio.isVisible")} description={t("portfolio.isVisibleHelper")} checked={values.isVisible} onChange={(on) => set("isVisible", on)} />
      <AppText variant="bodySmall" tone="mutedForeground">
        {t("profile.documentsUnavailable")}
      </AppText>
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}

function LanguageForm({ item, existing }: { item: Language | null; existing: string[] }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = { languageCode: item?.languageCode ?? "", proficiency: item?.proficiency ?? "" };
  const add = useForm({ initial, schema: languageInputSchema, toInput: (v) => v, submit: (input) => client.sections.languages.add(input) });
  const edit = useForm({
    initial,
    schema: sectionUpdateSchemas.languages,
    toInput: (v) => ({ proficiency: v.proficiency, expectedUpdatedAt: item?.updatedAt ?? "" }),
    submit: (input) => client.sections.languages.update(item?.id ?? "", input),
  });
  const form = item ? edit : add;
  const { values, set, error } = form;
  const levels = LANGUAGE_PROFICIENCIES.map((level) => ({ value: level, label: t(`languages.levels.${level}`) }));
  const knownCode = PROFILE_LANGUAGE_CODES.find((code) => code === item?.languageCode);
  return (
    <>
      {item ? (
        <AppText variant="label">{knownCode ? t(`languages.names.${knownCode}`) : item.languageCode}</AppText>
      ) : (
        <Select
          label={t("languages.language")}
          value={values.languageCode || null}
          onChange={(v) => set("languageCode", v)}
          error={error("languageCode")}
          options={PROFILE_LANGUAGE_CODES.filter((code) => !existing.includes(code)).map((code) => ({ value: code, label: t(`languages.names.${code}`) }))}
        />
      )}
      <Select label={t("languages.proficiency")} value={values.proficiency || null} onChange={(v) => set("proficiency", v)} error={error("proficiency")} options={levels} />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}
