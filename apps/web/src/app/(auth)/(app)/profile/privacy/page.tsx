import { createTranslator } from "@skillprove/shared/i18n";
import { PrivacySettings } from "../../../../../components/privacy/privacy-settings";
import { PageHeader } from "../../../../../components/shell/page-header";
import { Breadcrumb } from "../../../../../components/ui";
import { getRequestPreferences } from "../../../../../lib/preferences-server";

export default async function PrivacyPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: t("nav.profile"), href: "/profile" }, { label: t("privacy.title") }]} />
      <PageHeader title={t("privacy.title")} description={t("privacy.description")} />
      <PrivacySettings />
    </div>
  );
}
