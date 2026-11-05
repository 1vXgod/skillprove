import { createTranslator } from "@skillprove/shared/i18n";
import Link from "next/link";
import { ConnectionStatus } from "../components/connection-status";
import { LanguageMenu, ThemeMenu } from "../components/shell/preference-menus";
import { buttonClasses } from "../components/ui";
import { getRequestPreferences } from "../lib/preferences-server";

export default async function HomePage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[var(--sp-header-height)] items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <span className="type-h4 tracking-tight text-foreground">SkillProve</span>
        <div className="flex items-center gap-1">
          <LanguageMenu />
          <ThemeMenu />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="type-h1 text-foreground">{t("status.title")}</h1>
          <p className="type-body text-muted-foreground">{t("status.description")}</p>
        </div>
        <ConnectionStatus />
        <nav className="flex flex-wrap gap-2">
          <Link href="/sign-in" className={buttonClasses()}>
            {t("auth.signIn")}
          </Link>
          <Link href="/sign-up" className={buttonClasses({ variant: "outline" })}>
            {t("auth.createAccount")}
          </Link>
          <Link href="/account" className={buttonClasses({ variant: "ghost" })}>
            {t("status.openAccount")}
          </Link>
        </nav>
      </main>
    </div>
  );
}
