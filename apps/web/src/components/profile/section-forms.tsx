"use client";

import {
  AVAILABILITY_STATUSES,
  EMPLOYMENT_TYPES,
  LANGUAGE_PROFICIENCIES,
  PROFILE_COUNTRY_CODES,
  PROFILE_LANGUAGE_CODES,
  WORK_MODES,
  type EmploymentType,
  type WorkMode,
} from "@skillprove/shared";
import {
  availabilityInputSchema,
  certificateInputSchema,
  educationInputSchema,
  experienceInputSchema,
  languageInputSchema,
  portfolioInputSchema,
  profileInputSchema,
  profileUpdateSchema,
  sectionUpdateSchemas,
  type Certificate,
  type Education,
  type Experience,
  type Language,
  type OwnProfile,
  type PortfolioItem,
} from "@skillprove/validation";
import { useI18n } from "../../lib/i18n";
import { joinList, splitList, useApiClient } from "../../lib/use-api";
import { Checkbox, Input, Select, Switch, Textarea } from "../ui";
import { FormDialog } from "./form-dialog";

const orNull = (value: string) => (value.trim() === "" ? null : value);

interface DialogBase {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Basic details (also used to create the profile)
// ---------------------------------------------------------------------------

type BasicsValues = {
  fullName: string;
  headline: string;
  biography: string;
  city: string;
  countryCode: string;
  phoneNumber: string;
  contactEmail: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  interests: string;
};

const basicsFrom = (profile?: OwnProfile): BasicsValues => ({
  fullName: profile?.fullName ?? "",
  headline: profile?.headline ?? "",
  biography: profile?.biography ?? "",
  city: profile?.city ?? "",
  countryCode: profile?.countryCode ?? "XK",
  phoneNumber: profile?.phoneNumber ?? "",
  contactEmail: profile?.contactEmail ?? "",
  linkedinUrl: profile?.linkedinUrl ?? "",
  githubUrl: profile?.githubUrl ?? "",
  websiteUrl: profile?.websiteUrl ?? "",
  interests: joinList(profile?.interests ?? []),
});

export function BasicsFields({ form }: { form: { values: BasicsValues; set: <K extends keyof BasicsValues>(key: K, value: BasicsValues[K]) => void; error: (field: string) => string | undefined } }) {
  const { t } = useI18n();
  const { values, set, error } = form;
  const text = (key: keyof BasicsValues) => ({ value: values[key], onChange: (e: { target: { value: string } }) => set(key, e.target.value), error: error(key) });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input className="sm:col-span-2" label={t("profile.fullName")} autoComplete="name" required {...text("fullName")} />
      <Input className="sm:col-span-2" label={t("profile.headline")} helperText={t("profile.headlineHelper")} labelHint={t("common.optional")} {...text("headline")} />
      <Textarea className="sm:col-span-2" label={t("profile.biography")} labelHint={t("common.optional")} {...text("biography")} />
      <Input label={t("profile.city")} autoComplete="address-level2" labelHint={t("common.optional")} {...text("city")} />
      <Select
        label={t("profile.country")}
        value={values.countryCode}
        onChange={(e) => set("countryCode", e.target.value)}
        error={error("countryCode")}
        options={PROFILE_COUNTRY_CODES.map((code) => ({ value: code, label: t(`profile.countries.${code}`) }))}
      />
      <Input className="sm:col-span-2" label={t("profile.interests")} helperText={t("profile.interestsHelper")} labelHint={t("common.optional")} {...text("interests")} />
      <Input label={t("profile.contactEmail")} type="email" autoComplete="email" labelHint={t("common.optional")} {...text("contactEmail")} />
      <Input label={t("profile.phoneNumber")} type="tel" autoComplete="tel" helperText={t("profile.phoneHelper")} labelHint={t("common.optional")} {...text("phoneNumber")} />
      <Input label={t("profile.linkedinUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} {...text("linkedinUrl")} />
      <Input label={t("profile.githubUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} {...text("githubUrl")} />
      <Input className="sm:col-span-2" label={t("profile.websiteUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} {...text("websiteUrl")} />
    </div>
  );
}

const basicsInput = (v: BasicsValues) => ({ ...v, interests: splitList(v.interests) });

export function BasicsDialog({ profile, ...dialog }: DialogBase & { profile: OwnProfile }) {
  const { t } = useI18n();
  const client = useApiClient();
  return (
    <FormDialog
      {...dialog}
      title={t("profile.editBasics")}
      initial={basicsFrom(profile)}
      schema={profileUpdateSchema}
      toInput={(v) => ({ ...basicsInput(v), expectedUpdatedAt: profile.updatedAt })}
      submit={(input) => client.updateProfile(input)}
    >
      {(form) => <BasicsFields form={form} />}
    </FormDialog>
  );
}

export { basicsFrom, basicsInput, profileInputSchema };

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

function toggle<T>(list: readonly T[], item: T, on: boolean): T[] {
  return on ? [...list.filter((x) => x !== item), item] : list.filter((x) => x !== item);
}

export function AvailabilityDialog({ profile, ...dialog }: DialogBase & { profile: OwnProfile }) {
  const { t } = useI18n();
  const client = useApiClient();
  const { availability } = profile;
  return (
    <FormDialog
      {...dialog}
      title={t("availability.edit")}
      initial={{ status: availability.status, employmentTypes: availability.employmentTypes, workModes: availability.workModes, availableFrom: availability.availableFrom ?? "" }}
      schema={availabilityInputSchema}
      toInput={(v) => ({ ...v, availableFrom: orNull(v.availableFrom), expectedUpdatedAt: availability.updatedAt })}
      submit={(input) => client.updateAvailability(input)}
    >
      {({ values, set, error }) => (
        <>
          <Select
            label={t("availability.status")}
            value={values.status}
            onChange={(e) => set("status", AVAILABILITY_STATUSES.find((s) => s === e.target.value) ?? values.status)}
            options={AVAILABILITY_STATUSES.map((s) => ({ value: s, label: t(`availability.statuses.${s}`) }))}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 type-label text-foreground">{t("availability.workModes")}</legend>
            {WORK_MODES.map((mode: WorkMode) => (
              <Checkbox key={mode} label={t(`workMode.${mode}`)} checked={values.workModes.includes(mode)} onChange={(e) => set("workModes", toggle(values.workModes, mode, e.target.checked))} />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 type-label text-foreground">{t("availability.employmentTypes")}</legend>
            {EMPLOYMENT_TYPES.map((type: EmploymentType) => (
              <Checkbox key={type} label={t(`employmentType.${type}`)} checked={values.employmentTypes.includes(type)} onChange={(e) => set("employmentTypes", toggle(values.employmentTypes, type, e.target.checked))} />
            ))}
          </fieldset>
          <Input label={t("availability.availableFrom")} type="date" labelHint={t("common.optional")} value={values.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} error={error("availableFrom")} />
        </>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export function ExperienceDialog({ item, ...dialog }: DialogBase & { item: Experience | null }) {
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
  const toInput = (v: typeof initial) => ({
    ...v,
    employmentType: EMPLOYMENT_TYPES.find((type) => type === v.employmentType) ?? null,
    endDate: v.isCurrent ? null : orNull(v.endDate),
  });
  const fields = (form: { values: typeof initial; set: <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => void; error: (f: string) => string | undefined }) => {
    const { values, set, error } = form;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label={t("experiences.jobTitle")} value={values.title} onChange={(e) => set("title", e.target.value)} error={error("title")} />
        <Input label={t("experiences.company")} value={values.companyName} onChange={(e) => set("companyName", e.target.value)} error={error("companyName")} />
        <Select
          label={t("experiences.employmentType")}
          value={values.employmentType}
          onChange={(e) => set("employmentType", e.target.value)}
          placeholder=""
          options={EMPLOYMENT_TYPES.map((type) => ({ value: type, label: t(`employmentType.${type}`) }))}
        />
        <Input className="sm:col-span-2" label={t("experiences.location")} labelHint={t("common.optional")} value={values.location} onChange={(e) => set("location", e.target.value)} error={error("location")} />
        <Input label={t("experiences.startDate")} type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} error={error("startDate")} />
        <Input label={t("experiences.endDate")} type="date" value={values.isCurrent ? "" : values.endDate} disabled={values.isCurrent} onChange={(e) => set("endDate", e.target.value)} error={error("endDate")} />
        <Checkbox className="sm:col-span-2" label={t("experiences.isCurrent")} checked={values.isCurrent} onChange={(e) => set("isCurrent", e.target.checked)} />
        <Textarea className="sm:col-span-2" label={t("experiences.description")} labelHint={t("common.optional")} value={values.description} onChange={(e) => set("description", e.target.value)} error={error("description")} />
      </div>
    );
  };

  return item ? (
    <FormDialog {...dialog} title={t("experiences.edit")} initial={initial} schema={sectionUpdateSchemas.experiences} toInput={(v) => ({ ...toInput(v), expectedUpdatedAt: item.updatedAt })} submit={(input) => client.sections.experiences.update(item.id, input)}>
      {fields}
    </FormDialog>
  ) : (
    <FormDialog {...dialog} title={t("experiences.add")} initial={initial} schema={experienceInputSchema} toInput={toInput} submit={(input) => client.sections.experiences.add(input)}>
      {fields}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export function EducationDialog({ item, ...dialog }: DialogBase & { item: Education | null }) {
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
  const fields = ({ values, set, error }: { values: typeof initial; set: <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => void; error: (f: string) => string | undefined }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input className="sm:col-span-2" label={t("education.institution")} value={values.institution} onChange={(e) => set("institution", e.target.value)} error={error("institution")} />
      <Input label={t("education.degree")} labelHint={t("common.optional")} value={values.degree} onChange={(e) => set("degree", e.target.value)} error={error("degree")} />
      <Input label={t("education.fieldOfStudy")} labelHint={t("common.optional")} value={values.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} error={error("fieldOfStudy")} />
      <Input label={t("education.startDate")} type="date" labelHint={t("common.optional")} value={values.startDate} onChange={(e) => set("startDate", e.target.value)} error={error("startDate")} />
      <Input label={t("education.endDate")} type="date" helperText={t("education.endDateHelper")} labelHint={t("common.optional")} value={values.endDate} onChange={(e) => set("endDate", e.target.value)} error={error("endDate")} />
      <Textarea className="sm:col-span-2" label={t("education.description")} labelHint={t("common.optional")} value={values.description} onChange={(e) => set("description", e.target.value)} error={error("description")} />
    </div>
  );
  return item ? (
    <FormDialog {...dialog} title={t("education.edit")} initial={initial} schema={sectionUpdateSchemas.education} toInput={(v) => ({ ...toInput(v), expectedUpdatedAt: item.updatedAt })} submit={(input) => client.sections.education.update(item.id, input)}>
      {fields}
    </FormDialog>
  ) : (
    <FormDialog {...dialog} title={t("education.add")} initial={initial} schema={educationInputSchema} toInput={toInput} submit={(input) => client.sections.education.add(input)}>
      {fields}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export function CertificateDialog({ item, ...dialog }: DialogBase & { item: Certificate | null }) {
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
  const fields = ({ values, set, error }: { values: typeof initial; set: <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => void; error: (f: string) => string | undefined }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input className="sm:col-span-2" label={t("certificates.name")} value={values.name} onChange={(e) => set("name", e.target.value)} error={error("name")} />
      <Input label={t("certificates.issuer")} labelHint={t("common.optional")} value={values.issuer} onChange={(e) => set("issuer", e.target.value)} error={error("issuer")} />
      <Input label={t("certificates.credentialId")} labelHint={t("common.optional")} value={values.credentialId} onChange={(e) => set("credentialId", e.target.value)} error={error("credentialId")} />
      <Input className="sm:col-span-2" label={t("certificates.credentialUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} value={values.credentialUrl} onChange={(e) => set("credentialUrl", e.target.value)} error={error("credentialUrl")} />
      <Input label={t("certificates.issuedOn")} type="date" labelHint={t("common.optional")} value={values.issuedOn} onChange={(e) => set("issuedOn", e.target.value)} error={error("issuedOn")} />
      <Input label={t("certificates.expiresOn")} type="date" labelHint={t("common.optional")} value={values.expiresOn} onChange={(e) => set("expiresOn", e.target.value)} error={error("expiresOn")} />
      <p className="sm:col-span-2 type-body-small text-muted-foreground">{t("profile.documentsUnavailable")}</p>
    </div>
  );
  return item ? (
    <FormDialog {...dialog} title={t("certificates.edit")} initial={initial} schema={sectionUpdateSchemas.certificates} toInput={(v) => ({ ...toInput(v), expectedUpdatedAt: item.updatedAt })} submit={(input) => client.sections.certificates.update(item.id, input)}>
      {fields}
    </FormDialog>
  ) : (
    <FormDialog {...dialog} title={t("certificates.add")} initial={initial} schema={certificateInputSchema} toInput={toInput} submit={(input) => client.sections.certificates.add(input)}>
      {fields}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export function PortfolioDialog({ item, ...dialog }: DialogBase & { item: PortfolioItem | null }) {
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
  const fields = ({ values, set, error }: { values: typeof initial; set: <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => void; error: (f: string) => string | undefined }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input className="sm:col-span-2" label={t("portfolio.projectTitle")} value={values.title} onChange={(e) => set("title", e.target.value)} error={error("title")} />
      <Textarea className="sm:col-span-2" label={t("portfolio.description")} labelHint={t("common.optional")} value={values.description} onChange={(e) => set("description", e.target.value)} error={error("description")} />
      <Input className="sm:col-span-2" label={t("portfolio.technologies")} helperText={t("portfolio.technologiesHelper")} labelHint={t("common.optional")} value={values.technologies} onChange={(e) => set("technologies", e.target.value)} error={error("technologies")} />
      <Input label={t("portfolio.projectUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} value={values.projectUrl} onChange={(e) => set("projectUrl", e.target.value)} error={error("projectUrl")} />
      <Input label={t("portfolio.repositoryUrl")} type="url" placeholder="https://" labelHint={t("common.optional")} value={values.repositoryUrl} onChange={(e) => set("repositoryUrl", e.target.value)} error={error("repositoryUrl")} />
      <Input label={t("portfolio.completedOn")} type="date" labelHint={t("common.optional")} value={values.completedOn} onChange={(e) => set("completedOn", e.target.value)} error={error("completedOn")} />
      <Switch className="sm:col-span-2" label={t("portfolio.isVisible")} description={t("portfolio.isVisibleHelper")} checked={values.isVisible} onChange={(e) => set("isVisible", e.target.checked)} />
      <p className="sm:col-span-2 type-body-small text-muted-foreground">{t("profile.documentsUnavailable")}</p>
    </div>
  );
  return item ? (
    <FormDialog {...dialog} title={t("portfolio.edit")} initial={initial} schema={sectionUpdateSchemas.portfolio} toInput={(v) => ({ ...toInput(v), expectedUpdatedAt: item.updatedAt })} submit={(input) => client.sections.portfolio.update(item.id, input)}>
      {fields}
    </FormDialog>
  ) : (
    <FormDialog {...dialog} title={t("portfolio.add")} initial={initial} schema={portfolioInputSchema} toInput={toInput} submit={(input) => client.sections.portfolio.add(input)}>
      {fields}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export function LanguageDialog({ item, existing, ...dialog }: DialogBase & { item: Language | null; existing: readonly string[] }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = { languageCode: item?.languageCode ?? "", proficiency: item?.proficiency ?? "" };
  const levelOptions = LANGUAGE_PROFICIENCIES.map((level) => ({ value: level, label: t(`languages.levels.${level}`) }));
  const proficiencyField = ({ values, set, error }: { values: typeof initial; set: <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) => void; error: (f: string) => string | undefined }) => (
    <Select label={t("languages.proficiency")} value={values.proficiency} placeholder="" onChange={(e) => set("proficiency", e.target.value)} error={error("proficiency")} options={levelOptions} />
  );
  if (item) {
    return (
      <FormDialog {...dialog} title={t("languages.edit")} initial={initial} schema={sectionUpdateSchemas.languages} toInput={(v) => ({ proficiency: v.proficiency, expectedUpdatedAt: item.updatedAt })} submit={(input) => client.sections.languages.update(item.id, input)}>
        {(form) => (
          <>
            <p className="type-label text-foreground">{languageName(t, item.languageCode)}</p>
            {proficiencyField(form)}
          </>
        )}
      </FormDialog>
    );
  }
  return (
    <FormDialog {...dialog} title={t("languages.add")} initial={initial} schema={languageInputSchema} toInput={(v) => v} submit={(input) => client.sections.languages.add(input)}>
      {(form) => (
        <>
          <Select
            label={t("languages.language")}
            value={form.values.languageCode}
            placeholder=""
            onChange={(e) => form.set("languageCode", e.target.value)}
            error={form.error("languageCode")}
            options={PROFILE_LANGUAGE_CODES.filter((code) => !existing.includes(code)).map((code) => ({ value: code, label: t(`languages.names.${code}`) }))}
          />
          {proficiencyField(form)}
        </>
      )}
    </FormDialog>
  );
}

export function languageName(t: ReturnType<typeof useI18n>["t"], code: string): string {
  const known = PROFILE_LANGUAGE_CODES.find((c) => c === code);
  return known ? t(`languages.names.${known}`) : code;
}
