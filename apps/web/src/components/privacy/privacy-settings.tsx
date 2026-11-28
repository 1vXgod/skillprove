"use client";

import { PROFILE_VISIBILITIES, skillMedal, type ProfileVisibility } from "@skillprove/shared";
import { MedalFor } from "../passport/medal";
import { formatNumber } from "@skillprove/shared/i18n";
import type { CandidateView, OwnProfile, PrivacyInput } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { languageName } from "../profile/section-forms";
import { BriefcaseIcon, BuildingIcon, EyeIcon, EyeOffIcon, GlobeIcon, GraduationIcon, LockIcon, MailIcon, MapPinIcon, PhoneIcon, SearchIcon, ShieldIcon } from "../icons";
import { Alert, Avatar, Badge, Button, buttonClasses, Card, CardContent, CardHeader, IconTile, Radio, Skeleton, SkillMedal, Switch } from "../ui";

type Flag = keyof Omit<PrivacyInput, "visibility" | "expectedUpdatedAt" | "isDiscoverable">;

const VISIBILITY_ICONS: Record<ProfileVisibility, ReactNode> = {
  PRIVATE: <LockIcon size={18} />,
  VERIFIED_COMPANIES: <ShieldIcon size={18} />,
  ALL_COMPANIES: <BuildingIcon size={18} />,
  PUBLIC: <GlobeIcon size={18} />,
};

/** The section switches, grouped as people think of them. */
const GROUPS: { key: "contact" | "background" | "skills"; flags: { flag: Flag; icon: ReactNode }[] }[] = [
  {
    key: "contact",
    flags: [
      { flag: "showContactEmail", icon: <MailIcon size={18} /> },
      { flag: "showPhoneNumber", icon: <PhoneIcon size={18} /> },
      { flag: "showLocation", icon: <MapPinIcon size={18} /> },
    ],
  },
  {
    key: "background",
    flags: [
      { flag: "showExperience", icon: <BriefcaseIcon size={18} /> },
      { flag: "showEducation", icon: <GraduationIcon size={18} /> },
    ],
  },
  // The medal shows what this switch controls: medals reach companies only through it.
  { key: "skills", flags: [{ flag: "showVerifiedSkills", icon: <SkillMedal medal="gold" label="" size="sm" /> }] },
];

export function PrivacySettings() {
  const { t } = useI18n();
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  // Held here because the form below is rebuilt for each saved version.
  const [savedVersion, setSavedVersion] = useState<string | null>(null);

  if (profile.isPending) return <Skeleton className="h-64 w-full" />;
  if (profile.isError) return <Alert tone="error">{errorMessage(t, profile.error)}</Alert>;
  if (!profile.data) {
    return (
      <Alert tone="info" title={t("profile.createTitle")}>
        <Link href="/profile" className={buttonClasses({ variant: "link" })}>
          {t("profile.createAction")}
        </Link>
      </Alert>
    );
  }
  // Keyed by version, so a save elsewhere resets the form to the stored values.
  return (
    <PrivacyForm
      key={profile.data.privacy.updatedAt}
      profile={profile.data}
      justSaved={savedVersion === profile.data.privacy.updatedAt}
      onSaved={setSavedVersion}
    />
  );
}

function PrivacyForm({ profile, justSaved, onSaved }: { profile: OwnProfile; justSaved: boolean; onSaved: (version: string) => void }) {
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
  const discard = () => {
    save.reset();
    setValues(stored);
  };
  const saved = justSaved && !edited;
  const dirty = JSON.stringify(values) !== JSON.stringify(stored);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 flex items-center gap-3">
                <IconTile icon={<EyeIcon size={18} />} size="sm" />
                <span className="type-h4 text-foreground">{t("privacy.visibility")}</span>
              </legend>
              {PROFILE_VISIBILITIES.map((visibility: ProfileVisibility) => (
                <Radio
                  key={visibility}
                  card
                  icon={VISIBILITY_ICONS[visibility]}
                  name="visibility"
                  value={visibility}
                  label={t(`privacy.visibilities.${visibility}`)}
                  description={t(`privacy.visibilityHelp.${visibility}`)}
                  checked={values.visibility === visibility}
                  onChange={() => change({ visibility })}
                />
              ))}
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-6">
            <h2 className="type-h4 text-foreground">{t("privacy.sections")}</h2>
            {GROUPS.map((group) => (
              <fieldset key={group.key} className="flex flex-col gap-4">
                <legend className="mb-3 type-caption font-medium uppercase tracking-wide text-muted-foreground">{t(`privacy.groups.${group.key}`)}</legend>
                {group.flags.map(({ flag, icon }) => (
                  <Switch key={flag} icon={icon} label={t(`privacy.${flag}`)} checked={values[flag]} onChange={(e) => change({ [flag]: e.target.checked })} />
                ))}
              </fieldset>
            ))}
            <p className="rounded-lg bg-muted p-3 type-body-small text-muted-foreground">{t("privacy.alwaysShown")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="type-h4 text-foreground">{t("privacy.search")}</h2>
            <Switch
              icon={<SearchIcon size={18} />}
              label={t("privacy.isDiscoverable")}
              description={t("privacy.isDiscoverableHelp")}
              checked={values.isDiscoverable}
              onChange={(e) => change({ isDiscoverable: e.target.checked })}
            />
          </CardContent>
        </Card>

        {save.isError && <Alert tone="error">{errorMessage(t, save.error)}</Alert>}
        {saved && !dirty && <Alert tone="success">{t("privacy.saved")}</Alert>}
        {dirty && (
          // Stays in view while scrolling the long form, and only while there is something to save.
          <div className="sticky bottom-4 z-[var(--sp-z-sticky)] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3 shadow-md">
            <span className="type-label text-foreground">{t("privacy.unsaved")}</span>
            <span className="flex gap-2">
              <Button variant="ghost" onClick={discard} disabled={save.isPending}>
                {t("privacy.discard")}
              </Button>
              <Button loading={save.isPending} onClick={() => save.mutate()}>
                {t("common.save")}
              </Button>
            </span>
          </div>
        )}
      </div>
      <PrivacyPreview />
    </div>
  );
}

/** Fetched from the API, so it shows exactly the filtering the server applies. */
function PrivacyPreview() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const preview = useQuery({ queryKey: queryKeys.preview(locale), queryFn: client.getProfilePreview, retry: false });

  return (
    <Card data-testid="privacy-preview" className="lg:sticky lg:top-20">
      <CardHeader title={t("privacy.previewTitle")} description={t("privacy.previewNote")} />
      <CardContent className="pt-4">
        {preview.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : preview.isError ? (
          <Alert tone="error">{errorMessage(t, preview.error)}</Alert>
        ) : (
          <div className="flex flex-col gap-4">
            {preview.data.visibility === "PRIVATE" && <Alert tone="info">{t("privacy.previewPrivate")}</Alert>}
            <PreviewBody view={preview.data.view} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** One thing a company sees, or a greyed "Hidden" row when the settings hide it. */
function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useI18n();
  const hidden = value === null;
  return (
    <div className={cn("flex items-start gap-3 py-2.5", hidden && "opacity-60")}>
      {hidden ? <EyeOffIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" /> : <EyeIcon size={16} className="mt-0.5 shrink-0 text-success" />}
      <dt className="min-w-0 flex-1 type-label text-foreground">
        {label}
        <span className="sr-only">: {hidden ? t("common.hidden") : t("privacy.shown")}</span>
      </dt>
      <dd className="max-w-3/5 text-right type-body-small text-muted-foreground">{hidden ? <Badge>{t("common.hidden")}</Badge> : value}</dd>
    </div>
  );
}

function PreviewBody({ view }: { view: CandidateView }) {
  const { t, locale } = useI18n();
  const count = (items: unknown[] | null) => (items === null ? null : formatNumber(locale, items.length));
  const medals = (view.verifiedSkills ?? []).map((v) => ({ id: v.skill.id, medal: skillMedal(v.score, v.confidence), outdated: v.evidenceStatus === "OUTDATED" })).filter((m) => m.medal !== null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
        <Avatar name={view.fullName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-label text-foreground">{view.fullName}</span>
          {view.headline && <span className="truncate type-body-small text-muted-foreground">{view.headline}</span>}
        </div>
        {medals.length > 0 && (
          <span className="flex shrink-0 flex-wrap items-center gap-1">
            {medals.map((m) => (
              <MedalFor key={m.id} medal={m.medal} outdated={m.outdated} />
            ))}
          </span>
        )}
      </div>
      <dl className="flex flex-col divide-y divide-border">
        <PreviewRow label={t("privacy.showLocation")} value={view.location ? [view.location.city, view.location.countryCode].filter(Boolean).join(", ") : null} />
        <PreviewRow label={t("privacy.showContactEmail")} value={view.contact?.email ?? (view.contact ? t("profile.notAdded") : null)} />
        <PreviewRow label={t("privacy.showPhoneNumber")} value={view.contact?.phoneNumber ?? (view.contact ? t("profile.notAdded") : null)} />
        <PreviewRow label={t("experiences.title")} value={count(view.experiences)} />
        <PreviewRow label={t("education.title")} value={count(view.education)} />
        <PreviewRow label={t("certificates.title")} value={count(view.certificates)} />
        <PreviewRow label={t("portfolio.title")} value={formatNumber(locale, view.portfolio.length)} />
        <PreviewRow label={t("languages.title")} value={view.languages.map((l) => languageName(t, l.languageCode)).join(", ") || t("profile.notAdded")} />
        <PreviewRow label={t("passport.selfReportedTitle")} value={formatNumber(locale, view.selfReportedSkills.length)} />
        <PreviewRow label={t("passport.verifiedTitle")} value={count(view.verifiedSkills)} />
      </dl>
    </div>
  );
}
