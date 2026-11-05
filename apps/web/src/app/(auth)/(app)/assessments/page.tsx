import { createTranslator } from "@skillprove/shared/i18n";
import { AssessmentList } from "../../../../components/assessments/assessment-list";
import { PageHeader } from "../../../../components/shell/page-header";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function AssessmentsPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("assessments.title")} description={t("assessments.description")} />
      <AssessmentList />
    </div>
  );
}
