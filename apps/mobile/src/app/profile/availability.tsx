import { AVAILABILITY_STATUSES, EMPLOYMENT_TYPES, WORK_MODES } from "@skillprove/shared";
import { availabilityInputSchema, type OwnProfile } from "@skillprove/validation";
import { useQuery } from "@tanstack/react-query";
import { FormActions } from "../../components/profile/form-actions";
import { ProfileLoadState } from "../../components/profile/profile-load-state";
import { useForm } from "../../components/profile/use-form";
import { Screen } from "../../components/shell/screen";
import { SignedInGate } from "../../components/shell/signed-in-gate";
import { AppText, Card, Checkbox, Input, RadioGroup } from "../../components/ui";
import { orNull, queryKeys, useApiClient } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

export default function AvailabilityScreen() {
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
  const client = useApiClient();
  const profile = useQuery({ queryKey: queryKeys.ownProfile, queryFn: client.getOwnProfile, retry: false });
  if (!profile.isSuccess) return <ProfileLoadState profile={profile} />;
  if (!profile.data) return <AppText tone="mutedForeground">{t("profile.createDescription")}</AppText>;
  return <AvailabilityForm profile={profile.data} />;
}

const toggle = <T,>(list: readonly T[], item: T, on: boolean): T[] => (on ? [...list.filter((x) => x !== item), item] : list.filter((x) => x !== item));

function AvailabilityForm({ profile }: { profile: OwnProfile }) {
  const { t } = useI18n();
  const client = useApiClient();
  const { availability } = profile;
  const form = useForm({
    initial: { status: availability.status, employmentTypes: availability.employmentTypes, workModes: availability.workModes, availableFrom: availability.availableFrom ?? "" },
    schema: availabilityInputSchema,
    toInput: (v) => ({ ...v, availableFrom: orNull(v.availableFrom), expectedUpdatedAt: availability.updatedAt }),
    submit: (input) => client.updateAvailability(input),
  });
  const { values, set, error } = form;

  return (
    <>
      <AppText variant="h1" accessibilityRole="header">
        {t("availability.edit")}
      </AppText>
      <Card>
        <RadioGroup
          label={t("availability.status")}
          value={values.status}
          onChange={(status) => set("status", status)}
          options={AVAILABILITY_STATUSES.map((status) => ({ value: status, label: t(`availability.statuses.${status}`) }))}
        />
      </Card>
      <Card>
        <AppText variant="label">{t("availability.workModes")}</AppText>
        {WORK_MODES.map((mode) => (
          <Checkbox key={mode} label={t(`workMode.${mode}`)} checked={values.workModes.includes(mode)} onChange={(on) => set("workModes", toggle(values.workModes, mode, on))} />
        ))}
      </Card>
      <Card>
        <AppText variant="label">{t("availability.employmentTypes")}</AppText>
        {EMPLOYMENT_TYPES.map((type) => (
          <Checkbox key={type} label={t(`employmentType.${type}`)} checked={values.employmentTypes.includes(type)} onChange={(on) => set("employmentTypes", toggle(values.employmentTypes, type, on))} />
        ))}
      </Card>
      <Input label={t("availability.availableFrom")} labelHint={t("common.optional")} placeholder={t("common.dateFormat")} value={values.availableFrom} onChangeText={(v) => set("availableFrom", v)} error={error("availableFrom")} keyboardType="numbers-and-punctuation" />
      <FormActions saving={form.saving} formError={form.formError} onSave={form.save} />
    </>
  );
}
