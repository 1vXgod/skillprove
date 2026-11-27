"use client";

import { PROFILE_VISIBILITIES, skillMedal, type ProfileVisibility } from "@skillprove/shared";
import { MedalFor } from "../passport/medal";
import { formatNumber } from "@skillprove/shared/i18n";
import type { CandidateView, OwnProfile, PrivacyInput } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { languageName } from "../profile/section-forms";
import { Alert, Badge, Button, buttonClasses, Card, CardContent, CardHeader, Radio, RadioGroup, Separator, Skeleton, Switch } from "../ui";

type Flags = Omit<PrivacyInput, "visibility" | "expectedUpdatedAt">;
const FLAGS = ["showContactEmail", "showPhoneNumber", "showLocation", "showExperience", "showEducation", "showVerifiedSkills"] as const satisfies readonly (keyof Flags)[];

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
  const saved = justSaved && !edited;
  const dirty = JSON.stringify(values) !== JSON.stringify(stored);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <RadioGroup legend={t("privacy.visibility")}>
            {PROFILE_VISIBILITIES.map((visibility: ProfileVisibility) => (
              <Radio
                key={visibility}
                name="visibility"
                value={visibility}
                label={t(`privacy.visibilities.${visibility}`)}
                description={t(`privacy.visibilityHelp.${visibility}`)}
                checked={values.visibility === visibility}
                onChange={() => change({ visibility })}
              />
            ))}
          </RadioGroup>
          <Separator />
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 type-label text-foreground">{t("privacy.sections")}</legend>
            {FLAGS.map((flag) => (
              <Switch key={flag} label={t(`privacy.${flag}`)} checked={values[flag]} onChange={(e) => change({ [flag]: e.target.checked })} />
            ))}
            <p className="type-body-small text-muted-foreground">{t("privacy.alwaysShown")}</p>
          </fieldset>
          <Separator />
          <Switch label={t("privacy.isDiscoverable")} description={t("privacy.isDiscoverableHelp")} checked={values.isDiscoverable} onChange={(e) => change({ isDiscoverable: e.target.checked })} />
          {save.isError && <Alert tone="error">{errorMessage(t, save.error)}</Alert>}
          {saved && !dirty && <Alert tone="success">{t("privacy.saved")}</Alert>}
          <Button className="self-start" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>
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
    <Card data-testid="privacy-preview">
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

function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="type-label text-foreground">{label}</dt>
      <dd className="type-body-small text-muted-foreground">{value ?? <Badge>{t("common.hidden")}</Badge>}</dd>
    </div>
  );
}

function PreviewBody({ view }: { view: CandidateView }) {
  const { t, locale } = useI18n();
  const count = (items: unknown[] | null) => (items === null ? null : formatNumber(locale, items.length));
  return (
    <dl className="flex flex-col gap-3">
      <PreviewRow label={t("profile.fullName")} value={view.fullName} />
      <PreviewRow label={t("privacy.showLocation")} value={view.location ? [view.location.city, view.location.countryCode].filter(Boolean).join(", ") : null} />
      <PreviewRow label={t("privacy.showContactEmail")} value={view.contact?.email ?? (view.contact ? t("profile.notAdded") : null)} />
      <PreviewRow label={t("privacy.showPhoneNumber")} value={view.contact?.phoneNumber ?? (view.contact ? t("profile.notAdded") : null)} />
      <PreviewRow label={t("experiences.title")} value={count(view.experiences)} />
      <PreviewRow label={t("education.title")} value={count(view.education)} />
      <PreviewRow label={t("certificates.title")} value={count(view.certificates)} />
      <PreviewRow label={t("portfolio.title")} value={formatNumber(locale, view.portfolio.length)} />
      <PreviewRow label={t("languages.title")} value={view.languages.map((l) => languageName(t, l.languageCode)).join(", ") || t("profile.notAdded")} />
      <PreviewRow label={t("passport.selfReportedTitle")} value={formatNumber(locale, view.selfReportedSkills.length)} />
      <PreviewRow
        label={t("passport.verifiedTitle")}
        value={
          view.verifiedSkills === null ? null : (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {count(view.verifiedSkills)}
              {view.verifiedSkills.map((v) => (
                <MedalFor key={v.skill.id} medal={skillMedal(v.score, v.confidence)} outdated={v.evidenceStatus === "OUTDATED"} />
              ))}
            </span>
          )
        }
      />
    </dl>
  );
}
