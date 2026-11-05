import { createTranslator } from "@skillprove/shared/i18n";
import { AssessmentWizard } from "../../../../../components/assessments/wizard";
import { PageHeader } from "../../../../../components/shell/page-header";
import { getRequestPreferences } from "../../../../../lib/preferences-server";

export default async function NewAssessmentPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("assessments.wizard.title")} />
      <AssessmentWizard />
    </div>
  );
}
