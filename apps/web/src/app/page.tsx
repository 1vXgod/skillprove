import { createTranslator, type MessageKey } from "@skillprove/shared/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { LanguageMenu, ThemeMenu } from "../components/shell/preference-menus";
import { Badge, buttonClasses } from "../components/ui";
import { cn } from "../lib/cn";
import { getRequestPreferences } from "../lib/preferences-server";

export const metadata: Metadata = { title: "SkillProve" };

type Translate = ReturnType<typeof createTranslator>;
type Step = { title: MessageKey; body: MessageKey; className: string; tall?: boolean };

// Bento layout on md+: the tall card sits on the right for candidates and on the left for
// companies. On phones the cards simply stack in order.
const CANDIDATE_STEPS: Step[] = [
  { title: "landing.candidateSteps.profile.title", body: "landing.candidateSteps.profile.body", className: "md:col-span-2" },
  { title: "landing.candidateSteps.assess.title", body: "landing.candidateSteps.assess.body", className: "md:col-start-3 md:row-span-2 md:row-start-1", tall: true },
  { title: "landing.candidateSteps.passport.title", body: "landing.candidateSteps.passport.body", className: "md:col-span-2" },
];

// Company accounts arrive with company onboarding (Milestone 8), so this section only says what is
// coming and offers no company sign-up.
const COMPANY_STEPS: Step[] = [
  { title: "landing.companySteps.create.title", body: "landing.companySteps.create.body", className: "md:row-span-2", tall: true },
  { title: "landing.companySteps.invite.title", body: "landing.companySteps.invite.body", className: "md:col-span-2" },
  { title: "landing.companySteps.compare.title", body: "landing.companySteps.compare.body", className: "md:col-span-2" },
];

/**
 * The public landing page (Vision §2). Rendered on the server with no API calls and no
 * JavaScript of its own: the glow, glass and motion are CSS (globals.css), so it stays fast.
 * No product mock-up: sample data could be mistaken for real.
 */
export default async function LandingPage() {
  const { locale, themeChosen } = await getRequestPreferences();
  const t = createTranslator(locale);
  return (
    // Dark by default: until the visitor picks a theme in the header, the page uses the dark tokens
    // (the token selectors work on any element). A chosen theme always wins.
    <div data-landing data-theme={themeChosen ? undefined : "dark"} className="relative flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-[var(--sp-z-sticky)] border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--sp-header-height)] w-full max-w-[var(--sp-content-max-width)] items-center gap-2 px-4 sm:px-6">
          <span className="type-h4 tracking-tight text-foreground">SkillProve</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageMenu />
            <ThemeMenu />
            <Link href="/sign-in" className={buttonClasses({ variant: "ghost", size: "sm", className: "ml-1" })}>
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
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="landing-mesh -z-10" />
          <div aria-hidden="true" className="landing-grid -z-10" />
          <div className="mx-auto grid w-full max-w-[var(--sp-content-max-width)] items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:grid-cols-[1.25fr_1fr]">
            <div className="landing-enter flex flex-col items-start gap-7">
              <span className="glass-card rounded-full px-3 py-1 type-caption text-muted-foreground">{t("landing.eyebrow")}</span>
              <h1 id="hero-title" className="type-hero text-foreground">
                {t("landing.heroTitleLead")} <span className="text-gradient">{t("landing.heroTitleAccent")}</span>
              </h1>
              <p className="max-w-xl type-body-large text-muted-foreground">{t("landing.heroBody")}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/sign-up" className={buttonClasses({ size: "lg", className: "glow-button" })}>
                  {t("auth.createAccount")}
                </Link>
                <Link href="/sign-in" className={buttonClasses({ variant: "outline", size: "lg", className: "glass-card" })}>
                  {t("auth.signIn")}
                </Link>
              </div>
            </div>
            <VerifiedOrb className="landing-enter-late mx-auto w-full max-w-64 sm:max-w-80 lg:max-w-96" />
          </div>
        </section>

        <BentoSection id="candidates" title={t("landing.forCandidates")} steps={CANDIDATE_STEPS} t={t} />
        <BentoSection id="companies" title={t("landing.forCompanies")} badge={t("landing.comingSoon")} intro={t("landing.companyIntro")} steps={COMPANY_STEPS} t={t} />
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-[var(--sp-content-max-width)] px-4 py-8 sm:px-6">
          <p className="type-body-small text-muted-foreground">{t("landing.footer", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}

function BentoSection({ id, title, badge, intro, steps, t }: { id: string; title: string; badge?: string; intro?: string; steps: Step[]; t: Translate }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative isolate">
      <div aria-hidden="true" className="landing-section-glow -z-10" />
      <div className="mx-auto flex w-full max-w-[var(--sp-content-max-width)] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24">
        <div className="reveal flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id={`${id}-title`} className="type-display text-foreground">
              {title}
            </h2>
            {badge && <Badge tone="info">{badge}</Badge>}
          </div>
          {intro && <p className="max-w-2xl type-body-large text-muted-foreground">{intro}</p>}
        </div>
        <ol className="grid gap-4 md:auto-rows-fr md:grid-cols-3 md:grid-rows-2">
          {steps.map((step, i) => (
            <li key={step.title} className={cn("glass-card reveal flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8", step.className)}>
              <div className="flex flex-col gap-3">
                <span aria-hidden="true" className="text-gradient type-display tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="type-h3 text-foreground">{t(step.title)}</h3>
                <p className="max-w-md type-body text-muted-foreground">{t(step.body)}</p>
              </div>
              {step.tall && <LightArcs id={`${id}-arcs`} className="hidden w-full md:block" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Decorative arcs of light that fill the tall bento card. No data; hidden from screen readers. */
function LightArcs({ id, className }: { id: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 140" className={cn("verified-orb", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--sp-gradient-from)", stopOpacity: 0.2 }} />
          <stop offset="50%" style={{ stopColor: "var(--sp-gradient-to)" }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-gradient-from)", stopOpacity: 0.2 }} />
        </linearGradient>
      </defs>
      <path className="orb-ring" d="M20 140 A100 100 0 0 1 220 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.25" />
      <path className="orb-ring" d="M50 140 A70 70 0 0 1 190 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.25" strokeDasharray="2 8" strokeLinecap="round" />
      <path className="orb-ring" d="M80 140 A40 40 0 0 1 160 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.5" />
      <circle cx="120" cy="40" r="3" style={{ fill: "var(--sp-gradient-to)" }} />
    </svg>
  );
}

/**
 * An abstract "verified" mark made of light: breathing rings around a glowing check. Purely
 * decorative, so it is hidden from screen readers; it shows no data. Colours are theme tokens.
 */
function VerifiedOrb({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 320" className={cn("verified-orb", className)}>
      <defs>
        <radialGradient id="landing-orb-glow">
          <stop offset="0%" style={{ stopColor: "var(--sp-glow-primary)", stopOpacity: 0.55 }} />
          <stop offset="70%" style={{ stopColor: "var(--sp-glow-secondary)", stopOpacity: 0.12 }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-glow-secondary)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id="landing-orb-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--sp-gradient-from)" }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-gradient-to)" }} />
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="156" fill="url(#landing-orb-glow)" />
      <circle className="orb-ring" cx="160" cy="160" r="128" fill="none" stroke="url(#landing-orb-stroke)" strokeWidth="1" />
      <circle className="orb-ring" cx="160" cy="160" r="102" fill="none" stroke="url(#landing-orb-stroke)" strokeWidth="1.25" strokeDasharray="2 10" strokeLinecap="round" />
      <circle className="orb-ring" cx="160" cy="160" r="78" fill="none" stroke="url(#landing-orb-stroke)" strokeWidth="1.5" />
      <circle cx="288" cy="160" r="3" style={{ fill: "var(--sp-gradient-to)" }} />
      <circle cx="88" cy="88" r="2.5" style={{ fill: "var(--sp-gradient-from)" }} />
      <circle cx="210" cy="250" r="2" style={{ fill: "var(--sp-gradient-to)" }} />
      <circle cx="160" cy="160" r="52" style={{ fill: "var(--sp-background)", fillOpacity: 0.55 }} stroke="url(#landing-orb-stroke)" strokeWidth="2" />
      <path d="M138 161 l15 15 l30 -32" fill="none" stroke="url(#landing-orb-stroke)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
