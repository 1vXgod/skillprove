import { createTranslator } from "@skillprove/shared/i18n";
import { SkillPassportView } from "../../../../components/passport/skill-passport";
import { PageHeader } from "../../../../components/shell/page-header";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function SkillPassportPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("passport.title")} description={t("passport.description")} />
      <SkillPassportView />
    </div>
  );
}
