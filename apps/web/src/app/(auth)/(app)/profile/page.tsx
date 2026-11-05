import { createTranslator } from "@skillprove/shared/i18n";
import Link from "next/link";
import { ProfileOverview } from "../../../../components/profile/profile-overview";
import { PageHeader } from "../../../../components/shell/page-header";
import { buttonClasses } from "../../../../components/ui";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function ProfilePage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("profile.title")} description={t("profile.description")}>
        <div className="flex gap-2">
          <Link href="/skill-passport" className={buttonClasses({ variant: "outline" })}>
            {t("nav.skillPassport")}
          </Link>
          <Link href="/profile/privacy" className={buttonClasses({ variant: "outline" })}>
            {t("nav.privacy")}
          </Link>
        </div>
      </PageHeader>
      <ProfileOverview />
    </div>
  );
}
