import { createTranslator } from "@skillprove/shared/i18n";
import { PageHeader } from "../../../../components/shell/page-header";
import { TakeableList } from "../../../../components/take/takeable-list";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function TakeAssessmentsPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("take.title")} description={t("take.description")} />
      <TakeableList />
    </div>
  );
}
