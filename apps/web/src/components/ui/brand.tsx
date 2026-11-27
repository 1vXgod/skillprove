import { LOGO_MARK_SIZE } from "@skillprove/shared/brand";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { LightMark } from "./effects";

/*
 * Brand and dashboard pieces in the light-first style (design system "Brand and surfaces").
 * Every number they show comes from the caller, so they never invent data.
 */

/**
 * The SkillProve mark, from the files in public/brand (traced from the original artwork). In dark
 * mode the lighter variant shows; `inverse` is the white variant for navy backgrounds. Decorative:
 * the name is read from the wordmark, so the images have empty alt text.
 */
export function LogoMark({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  const img = (src: string, extra?: string) => (
    <Image src={src} alt="" width={LOGO_MARK_SIZE.width} height={LOGO_MARK_SIZE.height} unoptimized className={cn("w-auto", extra, className)} />
  );
  if (inverse) return img("/brand/skillprove-mark-inverse.svg");
  return (
    <>
      {img("/brand/skillprove-mark.svg", "sp-logo-light")}
      {img("/brand/skillprove-mark-dark.svg", "sp-logo-dark")}
    </>
  );
}

/**
 * Mark and wordmark. `inverse` is for the navy sidebar. The wordmark is real text in Plus Jakarta
 * Sans, so the name is read once ("SkillProve") and the mark stays decorative.
 */
export function Logo({ inverse = false, size = "md", className }: { inverse?: boolean; size?: "sm" | "md" | "lg"; className?: string }) {
  const mark = { sm: "h-6", md: "h-8", lg: "h-12" }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark inverse={inverse} className={mark} />
      <span className={cn("font-sans font-bold tracking-tight", text, inverse ? "text-sidebar-foreground" : "text-foreground")}>SkillProve</span>
    </span>
  );
}

const STAT_TONES = {
  primary: "bg-secondary text-primary",
  success: "bg-success-subtle text-success",
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning",
} as const;

/** One real number with its label, such as verified skills or profile completeness. */
export function StatCard({ icon, value, label, tone = "primary", className }: { icon: ReactNode; value: string; label: string; tone?: keyof typeof STAT_TONES; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border/70 bg-surface p-5 shadow-card", className)}>
      <span aria-hidden="true" className={cn("inline-flex size-10 items-center justify-center rounded-lg", STAT_TONES[tone])}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="type-h2 tabular-nums text-foreground">{value}</span>
        <span className="type-body-small text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/**
 * A skill in a list: name, a "score · level" line and an optional badge such as "Verified".
 * With `href` the whole row is a link and shows a chevron.
 */
export function SkillRow({ icon, title, detail, medal, badge, href }: { icon?: ReactNode; title: string; detail: string; medal?: ReactNode; badge?: ReactNode; href?: string }) {
  const body = (
    <>
      {icon && (
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate type-label text-foreground">{title}</span>
        <span className="type-body-small text-muted-foreground">{detail}</span>
      </span>
      {medal}
      {badge}
      {href && (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      )}
    </>
  );
  const row = "flex items-center gap-3 rounded-lg px-3 py-3";
  return href ? (
    <Link href={href} className={cn(row, "transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring")}>
      {body}
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
}

/**
 * The navy hero card from the reference: a serif headline, a line of text, one action, and the
 * light mark. White text on navy and brand blue meets AA.
 */
export function HeroCard({ title, body, action, mark = true, markId = "hero-card-mark", className }: { title: ReactNode; body?: string; action?: ReactNode; mark?: boolean; markId?: string; className?: string }) {
  return (
    <section className={cn("relative isolate overflow-hidden rounded-xl bg-linear-to-br from-sidebar to-glow-primary p-6 text-sidebar-foreground shadow-card sm:p-8", className)}>
      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
          <h2 className="type-h1 text-sidebar-foreground">{title}</h2>
          {body && <p className="max-w-md type-body text-sidebar-muted">{body}</p>}
          {action}
        </div>
        {mark && <LightMark id={markId} className="hidden w-32 shrink-0 sm:block" />}
      </div>
    </section>
  );
}
