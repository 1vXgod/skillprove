import { createTranslator } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SkillPassportView } from "../../../components/passport/skill-passport";
import { PrivacySettings } from "../../../components/privacy/privacy-settings";
import { ProfileOverview } from "../../../components/profile/profile-overview";
import { AppShell } from "../../../components/shell/app-shell";
import { PageHeader } from "../../../components/shell/page-header";
import { buttonClasses } from "../../../components/ui";
import { isDesignSystemEnabled } from "../../../lib/design-system";
import { getRequestPreferences } from "../../../lib/preferences-server";
import { PlaceholderTokenProvider } from "../../../lib/token-context";

export const metadata: Metadata = { title: "Candidate screens · SkillProve", robots: { index: false, follow: false } };

/**
 * Internal harness, gated like /design-system: the real candidate screens with a placeholder
 * token. Against the real API every request is rejected, so it shows error states; browser
 * tests intercept the API to exercise each flow. It is not a way to use the product.
 */
export default async function CandidateScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (!isDesignSystemEnabled()) notFound();
  const t = createTranslator((await getRequestPreferences()).locale);
  const { screen } = await searchParams;
  return (
    <PlaceholderTokenProvider>
      <AppShell
        showDesignSystem
        account={
          <Link href="/sign-in" className={buttonClasses({ variant: "outline", size: "sm" })}>
            {t("auth.signIn")}
          </Link>
        }
      >
        <div className="flex flex-col gap-6">
          {screen === "passport" ? (
            <>
              <PageHeader title={t("passport.title")} description={t("passport.description")} />
              <SkillPassportView />
            </>
          ) : screen === "privacy" ? (
            <>
              <PageHeader title={t("privacy.title")} description={t("privacy.description")} />
              <PrivacySettings />
            </>
          ) : (
            <>
              <PageHeader title={t("profile.title")} description={t("profile.description")} />
              <ProfileOverview />
            </>
          )}
        </div>
      </AppShell>
    </PlaceholderTokenProvider>
  );
}
