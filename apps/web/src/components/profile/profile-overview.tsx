"use client";

import { PROFILE_COUNTRY_CODES, todayInKosovo, type ProfileSection } from "@skillprove/shared";
import { formatDate, formatPhone } from "@skillprove/shared/i18n";
import {
  fieldErrors,
  profileInputSchema,
  type Certificate,
  type Education,
  type Experience,
  type Language,
  type OwnProfile,
  type PortfolioItem,
} from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { InboxIcon, SettingsIcon } from "../icons";
import { Alert, AlertDialog, Avatar, Badge, Button, Card, CardContent, CardHeader, EmptyState, Skeleton } from "../ui";
import { useDialog } from "./form-dialog";
import {
  AvailabilityDialog,
  BasicsDialog,
  BasicsFields,
  basicsFrom,
  basicsInput,
  CertificateDialog,
  EducationDialog,
  ExperienceDialog,
  LanguageDialog,
  languageName,
  PortfolioDialog,
} from "./section-forms";

/** Dates on profiles are months that matter, not days. */
function useMonth() {
  const { locale } = useI18n();
  return (date: string | null) => (date ? formatDate(locale, new Date(`${date}T00:00:00Z`), { year: "numeric", month: "short" }) : null);
}

export function ProfileOverview() {
  const { t } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });

  if (profile.isPending) {
    return (
      <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <Alert tone="error" title={t("errors.loadFailed")}>
        <div className="flex flex-col items-start gap-2">
          {errorMessage(t, profile.error)}
          <Button size="sm" variant="outline" onClick={() => void profile.refetch()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </Alert>
    );
  }
  if (!profile.data) return <CreateProfile />;
  return <ProfileDetails profile={profile.data} />;
}

function CreateProfile() {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(basicsFrom());
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: client.createProfile,
    onSuccess: (data) => queryClient.setQueryData(queryKeys.ownProfile, data),
  });
  const serverErrors = fieldErrorsOf(create.error);

  return (
    <Card>
      <CardHeader title={t("profile.createTitle")} description={t("profile.createDescription")} />
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = profileInputSchema.safeParse(basicsInput(values));
            if (!parsed.success) return setLocalErrors(fieldErrors(parsed.error));
            setLocalErrors({});
            create.mutate(parsed.data);
          }}
        >
          {create.isError && Object.keys(serverErrors).length === 0 && <Alert tone="error">{errorMessage(t, create.error)}</Alert>}
          <BasicsFields
            form={{
              values,
              set: (key, value) => setValues((v) => ({ ...v, [key]: value })),
              error: (field) => fieldMessage(t, localErrors[field] ?? serverErrors[field]),
            }}
          />
          <Button type="submit" loading={create.isPending} className="self-start">
            {t("profile.createAction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="break-words type-body text-foreground">{children}</dd>
    </div>
  );
}

function ItemActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 gap-1">
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`${t("common.edit")}: ${label}`}>
        {t("common.edit")}
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} aria-label={`${t("common.delete")}: ${label}`}>
        {t("common.delete")}
      </Button>
    </div>
  );
}

function SectionCard({ title, addLabel, onAdd, isEmpty, emptyText, children }: { title: string; addLabel: string; onAdd: () => void; isEmpty: boolean; emptyText: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={<Button size="sm" variant="outline" onClick={onAdd}>{addLabel}</Button>} />
      <CardContent className="pt-4">{isEmpty ? <EmptyState icon={<InboxIcon size={20} />} title={emptyText} /> : <ul className="flex flex-col divide-y divide-border">{children}</ul>}</CardContent>
    </Card>
  );
}

type Deleting = { section: ProfileSection; id: string; title: string } | null;

function ProfileDetails({ profile }: { profile: OwnProfile }) {
  const { t, locale } = useI18n();
  const month = useMonth();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const basics = useDialog<true>();
  const availability = useDialog<true>();
  const experience = useDialog<Experience | "new">();
  const education = useDialog<Education | "new">();
  const certificate = useDialog<Certificate | "new">();
  const portfolio = useDialog<PortfolioItem | "new">();
  const language = useDialog<Language | "new">();
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [deletingProfile, setDeletingProfile] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
  const removeItem = useMutation({ mutationFn: (target: NonNullable<Deleting>) => client.sections[target.section].remove(target.id), onSettled: refresh });
  const removeProfile = useMutation({ mutationFn: client.deleteProfile, onSuccess: () => queryClient.setQueryData(queryKeys.ownProfile, null) });

  const range = (start: string | null, end: string | null, current = false) =>
    [month(start), current ? t("common.present") : month(end)].filter(Boolean).join(" – ");
  const country = PROFILE_COUNTRY_CODES.find((code) => code === profile.countryCode);
  const location = [profile.city, country ? t(`profile.countries.${country}`) : profile.countryCode].filter(Boolean).join(", ");
  const today = todayInKosovo();
  const { availability: a } = profile;

  return (
    <div className="flex flex-col gap-6">
      {removeItem.isError && <Alert tone="error">{errorMessage(t, removeItem.error)}</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={profile.fullName} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="type-h2 text-foreground">{profile.fullName}</h2>
            {profile.headline && <p className="type-body-large text-muted-foreground">{profile.headline}</p>}
            <p className="type-body-small text-muted-foreground">{location}</p>
            <p className="pt-1 type-caption text-muted-foreground">{t("profile.photoUnavailable")}</p>
          </div>
          <Button variant="outline" icon={<SettingsIcon size={16} />} onClick={() => basics.open(true)}>
            {t("profile.editBasics")}
          </Button>
        </CardContent>
        <CardContent className="border-t border-border">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label={t("profile.biography")}>{profile.biography ?? <span className="text-muted-foreground">{t("profile.notAdded")}</span>}</Detail>
            <Detail label={t("profile.interests")}>
              {profile.interests.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <Badge key={interest}>{interest}</Badge>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("profile.noInterests")}</span>
              )}
            </Detail>
            <Detail label={t("profile.contactEmail")}>{profile.contactEmail ?? <span className="text-muted-foreground">{t("profile.notAdded")}</span>}</Detail>
            <Detail label={t("profile.phoneNumber")}>{profile.phoneNumber ? formatPhone(profile.phoneNumber) : <span className="text-muted-foreground">{t("profile.notAdded")}</span>}</Detail>
            {[profile.linkedinUrl, profile.githubUrl, profile.websiteUrl].some(Boolean) && (
              <Detail label={t("profile.contact")}>
                <span className="flex flex-col">
                  {[profile.linkedinUrl, profile.githubUrl, profile.websiteUrl].filter((link): link is string => Boolean(link)).map((link) => (
                    <a key={link} href={link} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-accent underline-offset-4 hover:underline">
                      {link}
                    </a>
                  ))}
                </span>
              </Detail>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("availability.title")} action={<Button size="sm" variant="outline" onClick={() => availability.open(true)}>{t("common.edit")}</Button>} />
        <CardContent className="pt-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label={t("availability.status")}>
              <Badge tone={a.status === "NOT_LOOKING" ? "neutral" : "success"}>{t(`availability.statuses.${a.status}`)}</Badge>
            </Detail>
            <Detail label={t("availability.workModes")}>{a.workModes.length ? a.workModes.map((m) => t(`workMode.${m}`)).join(", ") : t("availability.none")}</Detail>
            <Detail label={t("availability.employmentTypes")}>{a.employmentTypes.length ? a.employmentTypes.map((e) => t(`employmentType.${e}`)).join(", ") : t("availability.none")}</Detail>
            <Detail label={t("availability.availableFrom")}>{a.availableFrom ? formatDate(locale, new Date(`${a.availableFrom}T00:00:00Z`)) : t("profile.notAdded")}</Detail>
          </dl>
        </CardContent>
      </Card>

      <SectionCard title={t("experiences.title")} addLabel={t("experiences.add")} onAdd={() => experience.open("new")} isEmpty={profile.experiences.length === 0} emptyText={t("experiences.empty")}>
        {profile.experiences.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="type-label text-foreground">{item.title}</p>
              <p className="type-body-small text-foreground">
                {item.companyName}
                {item.employmentType && ` · ${t(`employmentType.${item.employmentType}`)}`}
              </p>
              <p className="type-caption text-muted-foreground">{[range(item.startDate, item.endDate, item.isCurrent), item.location].filter(Boolean).join(" · ")}</p>
              {item.description && <p className="whitespace-pre-line pt-1 type-body-small text-muted-foreground">{item.description}</p>}
            </div>
            <ItemActions label={item.title} onEdit={() => experience.open(item)} onDelete={() => setDeleting({ section: "experiences", id: item.id, title: t("experiences.deleteTitle") })} />
          </li>
        ))}
      </SectionCard>

      <SectionCard title={t("education.title")} addLabel={t("education.add")} onAdd={() => education.open("new")} isEmpty={profile.education.length === 0} emptyText={t("education.empty")}>
        {profile.education.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="type-label text-foreground">{item.institution}</p>
              <p className="type-body-small text-foreground">{[item.degree, item.fieldOfStudy].filter(Boolean).join(", ")}</p>
              <p className="type-caption text-muted-foreground">{range(item.startDate, item.endDate)}</p>
              {item.description && <p className="whitespace-pre-line pt-1 type-body-small text-muted-foreground">{item.description}</p>}
            </div>
            <ItemActions label={item.institution} onEdit={() => education.open(item)} onDelete={() => setDeleting({ section: "education", id: item.id, title: t("education.deleteTitle") })} />
          </li>
        ))}
      </SectionCard>

      <SectionCard title={t("certificates.title")} addLabel={t("certificates.add")} onAdd={() => certificate.open("new")} isEmpty={profile.certificates.length === 0} emptyText={t("certificates.empty")}>
        {profile.certificates.map((item) => {
          const expired = item.expiresOn !== null && item.expiresOn < today;
          return (
            <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-center gap-2 type-label text-foreground">
                  {item.name}
                  {expired && <Badge tone="warning">{t("certificates.expired")}</Badge>}
                </p>
                {item.issuer && <p className="type-body-small text-foreground">{item.issuer}</p>}
                <p className="type-caption text-muted-foreground">{range(item.issuedOn, item.expiresOn)}</p>
                {item.credentialUrl && (
                  <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer nofollow" className="type-body-small text-accent underline-offset-4 hover:underline">
                    {t("certificates.viewCredential")}
                  </a>
                )}
              </div>
              <ItemActions label={item.name} onEdit={() => certificate.open(item)} onDelete={() => setDeleting({ section: "certificates", id: item.id, title: t("certificates.deleteTitle") })} />
            </li>
          );
        })}
      </SectionCard>

      <SectionCard title={t("portfolio.title")} addLabel={t("portfolio.add")} onAdd={() => portfolio.open("new")} isEmpty={profile.portfolio.length === 0} emptyText={t("portfolio.empty")}>
        {profile.portfolio.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 type-label text-foreground">
                {item.title}
                {!item.isVisible && <Badge>{t("portfolio.onlyYou")}</Badge>}
              </p>
              {item.description && <p className="whitespace-pre-line type-body-small text-muted-foreground">{item.description}</p>}
              {item.technologies.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {item.technologies.map((tech) => (
                    <Badge key={tech} tone="info">{tech}</Badge>
                  ))}
                </span>
              )}
              <span className="flex flex-wrap gap-3 type-body-small">
                {item.projectUrl && <a href={item.projectUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-4 hover:underline">{t("portfolio.projectUrl")}</a>}
                {item.repositoryUrl && <a href={item.repositoryUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-4 hover:underline">{t("portfolio.repositoryUrl")}</a>}
              </span>
            </div>
            <ItemActions label={item.title} onEdit={() => portfolio.open(item)} onDelete={() => setDeleting({ section: "portfolio", id: item.id, title: t("portfolio.deleteTitle") })} />
          </li>
        ))}
      </SectionCard>

      <SectionCard title={t("languages.title")} addLabel={t("languages.add")} onAdd={() => language.open("new")} isEmpty={profile.languages.length === 0} emptyText={t("languages.empty")}>
        {profile.languages.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col">
              <p className="type-label text-foreground">{languageName(t, item.languageCode)}</p>
              <p className="type-body-small text-muted-foreground">{t(`languages.levels.${item.proficiency}`)}</p>
            </div>
            <ItemActions label={languageName(t, item.languageCode)} onEdit={() => language.open(item)} onDelete={() => setDeleting({ section: "languages", id: item.id, title: t("languages.deleteTitle") })} />
          </li>
        ))}
      </SectionCard>

      <div className="flex flex-col items-start gap-2 border-t border-border pt-6">
        {removeProfile.isError && <Alert tone="error">{errorMessage(t, removeProfile.error)}</Alert>}
        <Button variant="ghost" className="text-destructive" onClick={() => setDeletingProfile(true)}>
          {t("profile.deleteProfile")}
        </Button>
      </div>

      {basics.isOpen && <BasicsDialog open onOpenChange={basics.onOpenChange} profile={profile} />}
      {availability.isOpen && <AvailabilityDialog open onOpenChange={availability.onOpenChange} profile={profile} />}
      {experience.target && <ExperienceDialog open onOpenChange={experience.onOpenChange} item={experience.target === "new" ? null : experience.target} />}
      {education.target && <EducationDialog open onOpenChange={education.onOpenChange} item={education.target === "new" ? null : education.target} />}
      {certificate.target && <CertificateDialog open onOpenChange={certificate.onOpenChange} item={certificate.target === "new" ? null : certificate.target} />}
      {portfolio.target && <PortfolioDialog open onOpenChange={portfolio.onOpenChange} item={portfolio.target === "new" ? null : portfolio.target} />}
      {language.target && (
        <LanguageDialog open onOpenChange={language.onOpenChange} item={language.target === "new" ? null : language.target} existing={profile.languages.map((l) => l.languageCode)} />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting?.title ?? ""}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={() => deleting && removeItem.mutate(deleting)}
      />
      <AlertDialog
        open={deletingProfile}
        onOpenChange={setDeletingProfile}
        title={t("profile.deleteProfileTitle")}
        description={t("profile.deleteProfileBody")}
        confirmLabel={t("profile.deleteProfile")}
        destructive
        onConfirm={() => removeProfile.mutate()}
      />
    </div>
  );
}
