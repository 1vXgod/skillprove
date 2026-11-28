import { createTranslator } from "@skillprove/shared/i18n";
import { ClerkAccountSettings } from "../../../../components/account/clerk-account-settings";
import { PageHeader } from "../../../../components/shell/page-header";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function AccountPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("account.settingsTitle")} description={t("account.settingsDescription")} />
      <ClerkAccountSettings />
    </div>
  );
}
