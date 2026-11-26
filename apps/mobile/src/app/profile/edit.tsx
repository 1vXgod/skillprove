import { PROFILE_COUNTRY_CODES } from "@skillprove/shared";
import { profileInputSchema, profileUpdateSchema, type OwnProfile } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { FormActions } from "../../components/profile/form-actions";
import { QueryState } from "../../components/query-state";
import { useForm } from "../../components/profile/use-form";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { AppText, Input, Select, Textarea } from "../../components/ui";
import { joinList, queryKeys, splitList, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

/** Creates the profile if there is none, otherwise edits the basic details. */
export default function EditProfileScreen() {
  return (
    <Screen showBack>
      <SignedInGate>
        <Loader />
      </SignedInGate>
    </Screen>
  );
}

function Loader() {
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  if (!profile.isSuccess) return <QueryState query={profile} />;
  return <BasicsForm profile={profile.data ?? null} />;
}

function BasicsForm({ profile }: { profile: OwnProfile | null }) {
  const { t } = useI18n();
  const client = useApiClient();
  const initial = {
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
  };
  const toInput = (v: typeof initial) => ({ ...v, interests: splitList(v.interests) });
  const create = useForm({ initial, schema: profileInputSchema, toInput, submit: (input) => client.createProfile(input) });
  const update = useForm({
    initial,
    schema: profileUpdateSchema,
    toInput: (v) => ({ ...toInput(v), expectedUpdatedAt: profile?.updatedAt ?? "" }),
    submit: (input) => client.updateProfile(input),
  });
  const form = profile ? update : create;
  const { values, set, error } = form;

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {profile ? t("profile.editBasics") : t("profile.createTitle")}
      </AppText>
      {!profile && <AppText tone="mutedForeground">{t("profile.createDescription")}</AppText>}
      <Input label={t("profile.fullName")} value={values.fullName} onChangeText={(v) => set("fullName", v)} error={error("fullName")} autoComplete="name" textContentType="name" />
      <Input label={t("profile.headline")} labelHint={t("common.optional")} helperText={t("profile.headlineHelper")} value={values.headline} onChangeText={(v) => set("headline", v)} error={error("headline")} />
      <Textarea label={t("profile.biography")} labelHint={t("common.optional")} value={values.biography} onChangeText={(v) => set("biography", v)} error={error("biography")} />
      <Input label={t("profile.city")} labelHint={t("common.optional")} value={values.city} onChangeText={(v) => set("city", v)} error={error("city")} textContentType="addressCity" />
      <Select
        label={t("profile.country")}
        value={values.countryCode}
        onChange={(v) => set("countryCode", v)}
        error={error("countryCode")}
        options={PROFILE_COUNTRY_CODES.map((code) => ({ value: code, label: t(`profile.countries.${code}`) }))}
      />
      <Input label={t("profile.interests")} labelHint={t("common.optional")} helperText={t("profile.interestsHelper")} value={values.interests} onChangeText={(v) => set("interests", v)} error={error("interests")} />
      <Input label={t("profile.contactEmail")} labelHint={t("common.optional")} value={values.contactEmail} onChangeText={(v) => set("contactEmail", v)} error={error("contactEmail")} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
      <Input label={t("profile.phoneNumber")} labelHint={t("common.optional")} helperText={t("profile.phoneHelper")} value={values.phoneNumber} onChangeText={(v) => set("phoneNumber", v)} error={error("phoneNumber")} keyboardType="phone-pad" textContentType="telephoneNumber" />
      <Input label={t("profile.linkedinUrl")} labelHint={t("common.optional")} value={values.linkedinUrl} onChangeText={(v) => set("linkedinUrl", v)} error={error("linkedinUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <Input label={t("profile.githubUrl")} labelHint={t("common.optional")} value={values.githubUrl} onChangeText={(v) => set("githubUrl", v)} error={error("githubUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <Input label={t("profile.websiteUrl")} labelHint={t("common.optional")} value={values.websiteUrl} onChangeText={(v) => set("websiteUrl", v)} error={error("websiteUrl")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} saveLabel={profile ? undefined : t("profile.createAction")} />
    </>
  );
}
