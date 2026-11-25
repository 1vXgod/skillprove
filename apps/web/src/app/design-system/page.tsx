import { createTranslator, formatCurrency, formatDate, formatNumber, formatPhone } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignSystemShowcase } from "../../components/design-system-showcase";
import { AppShell } from "../../components/shell/app-shell";
import { buttonClasses } from "../../components/ui";
import { isDesignSystemEnabled } from "../../lib/design-system";
import { getRequestPreferences } from "../../lib/preferences-server";

export const metadata: Metadata = { title: "Design system · SkillProve", robots: { index: false, follow: false } };

export default async function DesignSystemPage() {
  if (!isDesignSystemEnabled()) notFound();
  const { locale } = await getRequestPreferences();
  const t = createTranslator(locale);
  const formatting = {
    date: formatDate(locale, new Date("2026-02-17T10:00:00Z")),
    number: formatNumber(locale, 1234567.89),
    currency: formatCurrency(locale, 1250),
    phone: formatPhone("044123456"),
  };
  return (
    <AppShell
      isCompanyMember
      showDesignSystem
      account={
        <Link href="/sign-in" className={buttonClasses({ variant: "outline", size: "sm" })}>
          {t("auth.signIn")}
        </Link>
      }
    >
      <DesignSystemShowcase formatting={formatting} />
    </AppShell>
  );
}
