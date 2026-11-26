import { ClerkProvider } from "@clerk/nextjs";
import { radius } from "@skillprove/shared/design";
import { createTranslator } from "@skillprove/shared/i18n";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "../../components/ui";
import { isClerkConfigured } from "../../lib/auth-config";
import { getRequestPreferences } from "../../lib/preferences-server";

// Clerk's components read the same CSS variables, so they follow the theme too.
const appearance = {
  variables: {
    colorPrimary: "var(--sp-primary)",
    colorPrimaryForeground: "var(--sp-primary-foreground)",
    colorBackground: "var(--sp-surface)",
    colorForeground: "var(--sp-foreground)",
    colorMutedForeground: "var(--sp-muted-foreground)",
    colorInput: "var(--sp-surface)",
    colorInputForeground: "var(--sp-foreground)",
    colorBorder: "var(--sp-border)",
    colorDanger: "var(--sp-destructive)",
    colorSuccess: "var(--sp-success)",
    colorWarning: "var(--sp-warning)",
    fontFamily: "var(--sp-font-sans)",
    borderRadius: `${radius.md}px`,
  },
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (!isClerkConfigured) {
    const t = createTranslator((await getRequestPreferences()).locale);
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-4 py-12">
        <h1 data-testid="auth-not-configured" className="type-h2 text-foreground">
          {t("auth.notConfiguredTitle")}
        </h1>
        <p className="type-body text-muted-foreground">{t("auth.notConfiguredBody")}</p>
        <Link href="/" className={buttonClasses({ variant: "link", className: "self-start" })}>
          {t("auth.backToHome")}
        </Link>
      </main>
    );
  }

  return (
    <ClerkProvider
      appearance={appearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/home"
      signUpFallbackRedirectUrl="/home"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
