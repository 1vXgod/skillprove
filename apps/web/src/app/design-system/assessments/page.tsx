import { createTranslator } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentEditor } from "../../../components/assessments/editor";
import { AssessmentList } from "../../../components/assessments/assessment-list";
import { GenerationProgress } from "../../../components/assessments/generation-progress";
import { AssessmentWizard } from "../../../components/assessments/wizard";
import { AppShell } from "../../../components/shell/app-shell";
import { PageHeader } from "../../../components/shell/page-header";
import { buttonClasses } from "../../../components/ui";
import { isDesignSystemEnabled } from "../../../lib/design-system";
import { getRequestPreferences } from "../../../lib/preferences-server";
import { PlaceholderTokenProvider } from "../../../lib/token-context";

export const metadata: Metadata = { title: "Assessment screens · SkillProve", robots: { index: false, follow: false } };

/**
 * Internal harness, gated like /design-system: the real assessment screens with a placeholder
 * token. Against the real API every request is rejected; browser tests intercept the API to
 * exercise each flow. It is not a way to use the product.
 */
export default async function AssessmentScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string; id?: string }> }) {
  if (!isDesignSystemEnabled()) notFound();
  const t = createTranslator((await getRequestPreferences()).locale);
  const { screen, id } = await searchParams;
  return (
    <PlaceholderTokenProvider>
      <AppShell
        isCompanyMember
        showDesignSystem
        account={
          <Link href="/sign-in" className={buttonClasses({ variant: "outline", size: "sm" })}>
            {t("auth.signIn")}
          </Link>
        }
      >
        <div className="flex flex-col gap-6">
          {screen === "wizard" ? (
            <>
              <PageHeader title={t("assessments.wizard.title")} />
              <AssessmentWizard />
            </>
          ) : screen === "progress" && id ? (
            <GenerationProgress jobId={id} />
          ) : screen === "editor" && id ? (
            <AssessmentEditor assessmentId={id} />
          ) : (
            <>
              <PageHeader title={t("assessments.title")} description={t("assessments.description")} />
              <AssessmentList />
            </>
          )}
        </div>
      </AppShell>
    </PlaceholderTokenProvider>
  );
}
