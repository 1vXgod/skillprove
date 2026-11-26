import { createTranslator, type MessageKey } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClipboardIcon, SuccessIcon, UserIcon } from "../components/icons";
import { LanguageMenu, ThemeMenu } from "../components/shell/preference-menus";
import { Badge, buttonClasses, GlowBackground, GradientText, LightMark, Logo } from "../components/ui";
import { getRequestPreferences } from "../lib/preferences-server";

export const metadata: Metadata = { title: "SkillProve" };

type Step = { title: MessageKey; body: MessageKey; icon: ReactNode };

const CANDIDATE_STEPS: Step[] = [
  { title: "landing.candidateSteps.profile.title", body: "landing.candidateSteps.profile.body", icon: <UserIcon size={20} /> },
  { title: "landing.candidateSteps.assess.title", body: "landing.candidateSteps.assess.body", icon: <ClipboardIcon size={20} /> },
  { title: "landing.candidateSteps.passport.title", body: "landing.candidateSteps.passport.body", icon: <SuccessIcon size={20} /> },
];

// Company accounts arrive with company onboarding (Milestone 8), so this section only says what is
// coming and offers no company sign-up.
const COMPANY_STEPS: Step[] = [
  { title: "landing.companySteps.create.title", body: "landing.companySteps.create.body", icon: <ClipboardIcon size={20} /> },
  { title: "landing.companySteps.invite.title", body: "landing.companySteps.invite.body", icon: <UserIcon size={20} /> },
  { title: "landing.companySteps.compare.title", body: "landing.companySteps.compare.body", icon: <SuccessIcon size={20} /> },
];

/**
 * The public landing page (Vision §2), in the light style of the visual reference: a serif hero,
 * how it works for candidates, what is coming for companies, and a short footer. Rendered on the
 * server with no API calls. It follows the visitor's theme (light by default). No photo, no other
 * companies' logos, and no features SkillProve does not have.
 */
export default async function LandingPage() {
  const t = createTranslator((await getRequestPreferences()).locale);
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <GlowBackground />
      <header className="sticky top-0 z-[var(--sp-z-sticky)] border-b border-border/60 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--sp-header-height)] w-full max-w-[var(--sp-content-max-width)] items-center gap-2 px-4 sm:px-6">
          <Logo size="sm" />
          <div className="ml-auto flex items-center gap-1">
            <LanguageMenu />
            <ThemeMenu />
            <Link href="/sign-in" className={buttonClasses({ variant: "outline", size: "sm", className: "ml-1" })}>
              {t("auth.signIn")}
            </Link>
            {/* The hero repeats this, so narrow phones keep the header to one line. */}
            <span className="hidden sm:inline-flex">
              <Link href="/sign-up" className={buttonClasses({ size: "sm" })}>
                {t("auth.createAccount")}
              </Link>
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section aria-labelledby="hero-title" className="mx-auto grid w-full max-w-[var(--sp-content-max-width)] items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="sp-enter flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1 type-caption text-muted-foreground shadow-card">
              <SuccessIcon size={14} className="text-primary" />
              {t("landing.eyebrow")}
            </span>
            <h1 id="hero-title" className="type-hero text-foreground">
              {t("landing.heroTitleLead")} <GradientText>{t("landing.heroTitleAccent")}</GradientText>
            </h1>
            <p className="max-w-xl type-body-large text-muted-foreground">{t("landing.heroBody")}</p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/sign-up" className={buttonClasses({ variant: "glow", size: "lg" })}>
                {t("auth.createAccount")}
              </Link>
              <Link href="/sign-in" className={buttonClasses({ variant: "ghost", size: "lg" })}>
                {t("auth.signIn")}
              </Link>
            </div>
          </div>
          {/* An abstract "verified" mark made of light; decorative, and it shows no data. */}
          <div className="sp-enter-late relative mx-auto w-full max-w-md">
            <div className="flex aspect-square items-center justify-center rounded-[2rem] border border-border/70 bg-surface shadow-card">
              <LightMark id="landing-mark" className="w-3/4" />
            </div>
            <span className="absolute -bottom-4 left-6 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface px-4 py-2.5 type-label text-foreground shadow-card">
              <SuccessIcon size={18} className="text-primary" />
              {t("passport.verifiedTitle")}
            </span>
          </div>
        </section>

        <StepsSection id="candidates" title={t("landing.forCandidates")} steps={CANDIDATE_STEPS} t={t} />
        <StepsSection id="companies" title={t("landing.forCompanies")} badge={t("landing.comingSoon")} intro={t("landing.companyIntro")} steps={COMPANY_STEPS} t={t} />
      </main>

      <footer className="border-t border-border/60 bg-surface/60">
        <div className="mx-auto flex w-full max-w-[var(--sp-content-max-width)] items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <Logo size="sm" />
          <p className="type-body-small text-muted-foreground">{t("landing.footer", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}

function StepsSection({ id, title, badge, intro, steps, t }: { id: string; title: string; badge?: string; intro?: string; steps: Step[]; t: ReturnType<typeof createTranslator> }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto flex w-full max-w-[var(--sp-content-max-width)] flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
      <div className="sp-reveal flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={`${id}-title`} className="type-display text-foreground">
            {title}
          </h2>
          {badge && <Badge tone="info">{badge}</Badge>}
        </div>
        {intro && <p className="max-w-2xl type-body-large text-muted-foreground">{intro}</p>}
      </div>
      <ol className="sp-reveal grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 shadow-card md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.title} className="flex flex-col gap-3 bg-surface p-6">
            <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
              {step.icon}
            </span>
            <h3 className="type-h4 text-foreground">{t(step.title)}</h3>
            <p className="type-body-small text-muted-foreground">{t(step.body)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
