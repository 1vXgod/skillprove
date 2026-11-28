"use client";

import { PROFILE_COUNTRY_CODES, todayInKosovo, type ProfileSection } from "@skillprove/shared";
import { formatDate, formatNumber, formatPhone } from "@skillprove/shared/i18n";
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
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys, useApiClient } from "../../lib/use-api";
import {
  BriefcaseIcon,
  CertificateIcon,
  ClockIcon,
  EditIcon,
  EyeIcon,
  FolderIcon,
  GraduationIcon,
  InboxIcon,
  LanguageIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  MoreIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "../icons";
import { Alert, AlertDialog, Avatar, Badge, Button, Card, CardContent, CardHeader, Chip, DropdownMenu, EmptyState, IconButton, IconTile, Skeleton } from "../ui";
import { ProfileStats } from "./profile-stats";
import { useDialog } from "./form-dialog";
import { VerifiedSkillsSection } from "./verified-skills-section";
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


/** A card heading with an icon tile, an optional count and one action. */
function SectionHeading({ icon, title, count, action }: { icon: ReactNode; title: string; count?: number; action?: ReactNode }) {
  const { locale } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 pt-6">
      <IconTile icon={icon} size="sm" />
      <h2 className="flex min-w-0 flex-1 basis-40 items-baseline gap-2 type-h4 text-foreground">
        {title}
        {count !== undefined && count > 0 && <span className="type-body-small tabular-nums text-muted-foreground">{formatNumber(locale, count)}</span>}
      </h2>
      {action}
    </div>
  );
}

/** Edit and Delete behind one keyboard-accessible menu. Delete still asks to confirm. */
function ItemActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <DropdownMenu
      trigger={(props) => <IconButton {...props} size="sm" label={t("profile.moreActions", { title: label })} icon={<MoreIcon size={18} />} />}
      groups={[
        {
          items: [
            { key: "edit", label: t("common.edit"), icon: <EditIcon size={16} />, onSelect: onEdit },
            { key: "delete", label: t("common.delete"), icon: <TrashIcon size={16} />, destructive: true, onSelect: onDelete },
          ],
        },
      ]}
    />
  );
}

function SectionCard({
  icon,
  title,
  addLabel,
  onAdd,
  count,
  emptyText,
  timeline = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  addLabel: string;
  onAdd: () => void;
  count: number;
  emptyText: string;
  timeline?: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <SectionHeading
        icon={icon}
        title={title}
        count={count}
        action={
          <Button size="sm" variant="outline" icon={<PlusIcon size={16} />} onClick={onAdd}>
            {addLabel}
          </Button>
        }
      />
      <CardContent className="pt-4">
        {count === 0 ? (
          <EmptyState icon={<InboxIcon size={20} />} title={emptyText} className="py-8" />
        ) : (
          <ul className={timeline ? "flex flex-col" : "flex flex-col divide-y divide-border"}>{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

/** One entry. On a timeline a dot and a line join the entries. */
function Entry({ timeline = false, actions, children }: { timeline?: boolean; actions: ReactNode; children: ReactNode }) {
  if (timeline) {
    return (
      <li className="group relative flex gap-4 pb-6 last:pb-0">
        <span aria-hidden="true" className="relative flex w-3 shrink-0 justify-center">
          <span className="mt-1.5 size-3 rounded-full border-2 border-primary bg-surface" />
          <span className="absolute bottom-0 top-5 w-px bg-border group-last:hidden" />
        </span>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
          {actions}
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
      {actions}
    </li>
  );
}

function ContactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="type-caption text-muted-foreground">{label}</span>
        <span className="break-words type-body-small text-foreground">{children}</span>
      </span>
    </li>
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
  const notAdded = <span className="text-muted-foreground">{t("profile.notAdded")}</span>;
  const links = [
    { label: t("profile.linkedinUrl"), url: profile.linkedinUrl },
    { label: t("profile.githubUrl"), url: profile.githubUrl },
    { label: t("profile.websiteUrl"), url: profile.websiteUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return (
    <div className="flex flex-col gap-6">
      {removeItem.isError && <Alert tone="error">{errorMessage(t, removeItem.error)}</Alert>}

      <section className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-sidebar to-glow-primary p-6 text-sidebar-foreground shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={profile.fullName} size="lg" className="ring-2 ring-sidebar-foreground/30" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="type-h2 text-sidebar-foreground">{profile.fullName}</h2>
            {profile.headline && <p className="type-body-large text-sidebar-muted">{profile.headline}</p>}
            {location && (
              <p className="inline-flex items-center gap-1.5 type-body-small text-sidebar-muted">
                <MapPinIcon size={16} />
                {location}
              </p>
            )}
          </div>
          <Button variant="secondary" icon={<EditIcon size={16} />} onClick={() => basics.open(true)} className="self-start">
            {t("profile.editBasics")}
          </Button>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("availability.title")}>
          <Chip inverse icon={<BriefcaseIcon size={14} />}>{t(`availability.statuses.${a.status}`)}</Chip>
          {a.workModes.map((m) => (
            <Chip inverse key={m}>{t(`workMode.${m}`)}</Chip>
          ))}
          <Chip inverse icon={<EyeIcon size={14} />}>
            <Link href="/profile/privacy" className="underline-offset-4 hover:underline">
              {t("profile.visibilityChip", { who: t(`privacy.visibilities.${profile.privacy.visibility}`) })}
            </Link>
          </Chip>
        </ul>
        <p className="mt-4 type-caption text-sidebar-muted">{t("profile.photoUnavailable")}</p>
      </section>

      <ProfileStats profile={profile} />

      <VerifiedSkillsSection shownToCompanies={profile.privacy.showVerifiedSkills} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading icon={<UserIcon size={18} />} title={t("profile.biography")} />
          <CardContent className="flex flex-col gap-4 pt-4">
            <p className="whitespace-pre-line type-body text-foreground">{profile.biography ?? notAdded}</p>
            <div className="flex flex-col gap-2">
              <p className="type-caption text-muted-foreground">{t("profile.interests")}</p>
              {profile.interests.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Chip key={interest}>{interest}</Chip>
                  ))}
                </ul>
              ) : (
                <p className="type-body-small text-muted-foreground">{t("profile.noInterests")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <SectionHeading icon={<MailIcon size={18} />} title={t("profile.contact")} />
          <CardContent className="pt-4">
            <ul className="flex flex-col gap-4">
              <ContactRow icon={<MailIcon size={18} />} label={t("profile.contactEmail")}>
                {profile.contactEmail ?? notAdded}
              </ContactRow>
              <ContactRow icon={<PhoneIcon size={18} />} label={t("profile.phoneNumber")}>
                {profile.phoneNumber ? formatPhone(profile.phoneNumber) : notAdded}
              </ContactRow>
              {links.map((link) => (
                <ContactRow key={link.url} icon={<LinkIcon size={18} />} label={link.label}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-4 hover:underline">
                    {link.url}
                  </a>
                </ContactRow>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <SectionHeading
          icon={<ClockIcon size={18} />}
          title={t("availability.title")}
          action={
            <Button size="sm" variant="outline" icon={<EditIcon size={16} />} onClick={() => availability.open(true)}>
              {t("common.edit")}
            </Button>
          }
        />
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

      <SectionCard timeline icon={<BriefcaseIcon size={18} />} title={t("experiences.title")} addLabel={t("experiences.add")} onAdd={() => experience.open("new")} count={profile.experiences.length} emptyText={t("experiences.empty")}>
        {profile.experiences.map((item) => (
          <Entry
            key={item.id}
            timeline
            actions={<ItemActions label={item.title} onEdit={() => experience.open(item)} onDelete={() => setDeleting({ section: "experiences", id: item.id, title: t("experiences.deleteTitle") })} />}
          >
            <p className="type-label text-foreground">{item.title}</p>
            <p className="type-body-small text-foreground">
              {item.companyName}
              {item.employmentType && ` · ${t(`employmentType.${item.employmentType}`)}`}
            </p>
            <p className="type-caption text-muted-foreground">{[range(item.startDate, item.endDate, item.isCurrent), item.location].filter(Boolean).join(" · ")}</p>
            {item.description && <p className="whitespace-pre-line pt-1 type-body-small text-muted-foreground">{item.description}</p>}
          </Entry>
        ))}
      </SectionCard>

      <SectionCard timeline icon={<GraduationIcon size={18} />} title={t("education.title")} addLabel={t("education.add")} onAdd={() => education.open("new")} count={profile.education.length} emptyText={t("education.empty")}>
        {profile.education.map((item) => (
          <Entry
            key={item.id}
            timeline
            actions={<ItemActions label={item.institution} onEdit={() => education.open(item)} onDelete={() => setDeleting({ section: "education", id: item.id, title: t("education.deleteTitle") })} />}
          >
            <p className="type-label text-foreground">{item.institution}</p>
            <p className="type-body-small text-foreground">{[item.degree, item.fieldOfStudy].filter(Boolean).join(", ")}</p>
            <p className="type-caption text-muted-foreground">{range(item.startDate, item.endDate)}</p>
            {item.description && <p className="whitespace-pre-line pt-1 type-body-small text-muted-foreground">{item.description}</p>}
          </Entry>
        ))}
      </SectionCard>

      <SectionCard icon={<CertificateIcon size={18} />} title={t("certificates.title")} addLabel={t("certificates.add")} onAdd={() => certificate.open("new")} count={profile.certificates.length} emptyText={t("certificates.empty")}>
        {profile.certificates.map((item) => {
          const expired = item.expiresOn !== null && item.expiresOn < today;
          return (
            <Entry
              key={item.id}
              actions={<ItemActions label={item.name} onEdit={() => certificate.open(item)} onDelete={() => setDeleting({ section: "certificates", id: item.id, title: t("certificates.deleteTitle") })} />}
            >
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
            </Entry>
          );
        })}
      </SectionCard>

      <SectionCard icon={<FolderIcon size={18} />} title={t("portfolio.title")} addLabel={t("portfolio.add")} onAdd={() => portfolio.open("new")} count={profile.portfolio.length} emptyText={t("portfolio.empty")}>
        {profile.portfolio.map((item) => (
          <Entry
            key={item.id}
            actions={<ItemActions label={item.title} onEdit={() => portfolio.open(item)} onDelete={() => setDeleting({ section: "portfolio", id: item.id, title: t("portfolio.deleteTitle") })} />}
          >
            <p className="flex flex-wrap items-center gap-2 type-label text-foreground">
              {item.title}
              {!item.isVisible && <Badge>{t("portfolio.onlyYou")}</Badge>}
            </p>
            {item.description && <p className="whitespace-pre-line type-body-small text-muted-foreground">{item.description}</p>}
            {item.technologies.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {item.technologies.map((tech) => (
                  <Badge key={tech} tone="info">
                    {tech}
                  </Badge>
                ))}
              </span>
            )}
            <span className="flex flex-wrap gap-3 type-body-small">
              {item.projectUrl && (
                <a href={item.projectUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-4 hover:underline">
                  {t("portfolio.projectUrl")}
                </a>
              )}
              {item.repositoryUrl && (
                <a href={item.repositoryUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-4 hover:underline">
                  {t("portfolio.repositoryUrl")}
                </a>
              )}
            </span>
          </Entry>
        ))}
      </SectionCard>

      <SectionCard icon={<LanguageIcon size={18} />} title={t("languages.title")} addLabel={t("languages.add")} onAdd={() => language.open("new")} count={profile.languages.length} emptyText={t("languages.empty")}>
        {profile.languages.map((item) => (
          <Entry
            key={item.id}
            actions={
              <ItemActions label={languageName(t, item.languageCode)} onEdit={() => language.open(item)} onDelete={() => setDeleting({ section: "languages", id: item.id, title: t("languages.deleteTitle") })} />
            }
          >
            <p className="type-label text-foreground">{languageName(t, item.languageCode)}</p>
            <p className="type-body-small text-muted-foreground">{t(`languages.levels.${item.proficiency}`)}</p>
          </Entry>
        ))}
      </SectionCard>

      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="type-h4 text-destructive">{t("profile.dangerZone")}</h2>
            <p className="type-body-small text-muted-foreground">{t("profile.deleteProfileBody")}</p>
          </div>
          <Button variant="outline" icon={<TrashIcon size={16} />} className="shrink-0 text-destructive" onClick={() => setDeletingProfile(true)}>
            {t("profile.deleteProfile")}
          </Button>
        </CardContent>
        {removeProfile.isError && (
          <CardContent className="pt-0">
            <Alert tone="error">{errorMessage(t, removeProfile.error)}</Alert>
          </CardContent>
        )}
      </Card>

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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="break-words type-body text-foreground">{children}</dd>
    </div>
  );
}
