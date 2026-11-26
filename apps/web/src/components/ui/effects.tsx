import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
 * The modern look as reusable pieces (design system "Effects"). Styles live in globals.css
 * (`.sp-*`) and read the theme tokens, so they follow light and dark. All of it is decorative:
 * nothing here carries information, and reduced motion makes it still.
 */

/**
 * Brand-coloured light behind a section. Put it first inside a `relative isolate` container.
 * `drift` animates two glows slowly; `soft` is a still glow for behind a group of cards.
 */
export function GlowBackground({ variant = "drift", grid = false }: { variant?: "drift" | "soft"; grid?: boolean }) {
  return (
    <>
      <div aria-hidden="true" className={variant === "drift" ? "sp-glow-bg" : "sp-glow-soft"} />
      {grid && <div aria-hidden="true" className="sp-grid-bg" />}
    </>
  );
}

/** An accent word or phrase in the brand gradient. Readers and forced-colours mode get plain text. */
export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("sp-gradient-text", className)}>{children}</span>;
}

/**
 * An abstract "verified" mark made of light: breathing rings around a glowing check. Hidden
 * from screen readers and shows no data. `id` keeps gradient IDs unique when used more than once.
 */
export function LightMark({ id = "sp-light-mark", className }: { id?: string; className?: string }) {
  const glow = `${id}-glow`;
  const stroke = `${id}-stroke`;
  return (
    <svg aria-hidden="true" viewBox="0 0 320 320" className={cn("sp-light-mark", className)}>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0%" style={{ stopColor: "var(--sp-glow-primary)", stopOpacity: 0.55 }} />
          <stop offset="70%" style={{ stopColor: "var(--sp-glow-secondary)", stopOpacity: 0.12 }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-glow-secondary)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={stroke} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--sp-gradient-from)" }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-gradient-to)" }} />
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="156" fill={`url(#${glow})`} />
      <circle className="sp-light-ring" cx="160" cy="160" r="128" fill="none" stroke={`url(#${stroke})`} strokeWidth="1" />
      <circle className="sp-light-ring" cx="160" cy="160" r="102" fill="none" stroke={`url(#${stroke})`} strokeWidth="1.25" strokeDasharray="2 10" strokeLinecap="round" />
      <circle className="sp-light-ring" cx="160" cy="160" r="78" fill="none" stroke={`url(#${stroke})`} strokeWidth="1.5" />
      <circle cx="288" cy="160" r="3" style={{ fill: "var(--sp-gradient-to)" }} />
      <circle cx="88" cy="88" r="2.5" style={{ fill: "var(--sp-gradient-from)" }} />
      <circle cx="210" cy="250" r="2" style={{ fill: "var(--sp-gradient-to)" }} />
      <circle cx="160" cy="160" r="52" style={{ fill: "var(--sp-background)", fillOpacity: 0.55 }} stroke={`url(#${stroke})`} strokeWidth="2" />
      <path d="M138 161 l15 15 l30 -32" fill="none" stroke={`url(#${stroke})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Arcs of light that fill empty space in a tall card. Decorative; `id` must be unique on the page. */
export function LightArcs({ id, className }: { id: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 140" className={cn("sp-light-mark", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--sp-gradient-from)", stopOpacity: 0.2 }} />
          <stop offset="50%" style={{ stopColor: "var(--sp-gradient-to)" }} />
          <stop offset="100%" style={{ stopColor: "var(--sp-gradient-from)", stopOpacity: 0.2 }} />
        </linearGradient>
      </defs>
      <path className="sp-light-ring" d="M20 140 A100 100 0 0 1 220 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.25" />
      <path className="sp-light-ring" d="M50 140 A70 70 0 0 1 190 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.25" strokeDasharray="2 8" strokeLinecap="round" />
      <path className="sp-light-ring" d="M80 140 A40 40 0 0 1 160 140" fill="none" stroke={`url(#${id})`} strokeWidth="1.5" />
      <circle cx="120" cy="40" r="3" style={{ fill: "var(--sp-gradient-to)" }} />
    </svg>
  );
}
