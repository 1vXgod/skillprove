import { createTranslator } from "@skillprove/shared/i18n";
import { AccountSession } from "../../../../components/account-session";
import { getRequestPreferences } from "../../../../lib/preferences-server";

export default async function AccountPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-h1 text-foreground">{t("account.title")}</h1>
        <p className="type-body text-muted-foreground">{t("account.description")}</p>
      </header>
      <AccountSession />
    </div>
  );
}
