"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { BriefcaseIcon, ClipboardIcon, CloseIcon, MenuIcon, PaletteIcon, SettingsIcon, SuccessIcon, UserIcon, UsersIcon } from "../icons";
import { GradientText, IconButton, Logo } from "../ui";
import { navSections, type NavIcon, type NavItem, type NavSection } from "./nav";
import { OfflineNotice } from "./offline-notice";
import { LanguageMenu, ThemeMenu } from "./preference-menus";

/** The logo, linking home. `inverse` is the white version for the navy sidebar. */
function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center rounded-md", inverse && "focus-visible:outline-sidebar-foreground")}>
      <Logo size="sm" inverse={inverse} />
    </Link>
  );
}

const ICONS: Record<NavIcon, typeof UserIcon> = {
  user: UserIcon,
  passport: SuccessIcon,
  assessments: ClipboardIcon,
  account: SettingsIcon,
  candidates: UsersIcon,
  jobs: BriefcaseIcon,
  designSystem: PaletteIcon,
};

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ label, icon, href }) => {
        const Icon = ICONS[icon];
        const content = (
          <>
            <Icon size={18} />
            <span className="flex-1">{t(label)}</span>
          </>
        );
        const base = "relative flex h-10 items-center gap-3 rounded-lg px-3 type-label";
        if (!href) {
          return (
            <li key={`${label}-soon`}>
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-sidebar-muted/70")}>
                {content}
                <span className="rounded-full bg-sidebar-active px-2 py-0.5 type-caption text-sidebar-muted">{t("common.comingSoon")}</span>
              </span>
            </li>
          );
        }
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                base,
                "transition-colors duration-150 focus-visible:outline-sidebar-foreground",
                active ? "bg-sidebar-active text-sidebar-active-foreground" : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
              )}
            >
              {/* A thin brand-blue bar marks the current page, besides aria-current and the colour. */}
              {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-glow-primary" />}
              {content}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavSections({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={section.heading ?? i}>
          {section.heading && (
            <h2 className="mb-1 px-3 type-caption uppercase tracking-wide text-sidebar-muted">
              {t(section.heading)}
            </h2>
          )}
          <NavList items={section.items} onNavigate={onNavigate} />
        </div>
      ))}
    </div>
  );
}

interface AppShellProps {
  /** The account control for the header, such as UserMenu. */
  account: ReactNode;
  /** Lists the internal design system page in navigation. */
  showDesignSystem?: boolean;
  /** Shows the Company section (assessment authoring). Only company members need it. */
  isCompanyMember?: boolean;
  children: ReactNode;
}

/** The brand line at the foot of the sidebar, as in the visual reference. Text only. */
function SidebarTagline() {
  const { t } = useI18n();
  return (
    <div className="m-3 rounded-xl bg-sidebar-active/70 p-4">
      <p className="type-h4 font-display font-normal leading-snug text-sidebar-foreground">
        {t("landing.heroTitleLead")} <GradientText className="sp-gradient-on-navy">{t("landing.heroTitleAccent")}</GradientText>
      </p>
    </div>
  );
}

/**
 * The signed-in layout: a fixed sidebar from the lg breakpoint, and a drawer below it. The
 * drawer is a native modal dialog, so focus is trapped and Escape closes it.
 */
export function AppShell({ account, showDesignSystem = false, isCompanyMember = false, children }: AppShellProps) {
  const { t } = useI18n();
  const sections = navSections({ isCompanyMember, showDesignSystem });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-[var(--sp-z-tooltip)] rounded-md bg-surface px-4 py-2 type-label text-foreground shadow-md focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("shell.skipToContent")}
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-[var(--sp-sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-[var(--sp-header-height)] items-center px-5">
          <Brand inverse />
        </div>
        <nav aria-label={t("shell.mainNavigation")} className="flex-1 overflow-y-auto px-3 py-4">
          <NavSections sections={sections} />
        </nav>
        <SidebarTagline />
      </aside>

      <dialog
        ref={drawer}
        aria-label={t("shell.mainNavigation")}
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setDrawerOpen(false)}
        className="sp-dialog m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden"
      >
        <div className="flex h-[var(--sp-header-height)] items-center justify-between px-4">
          <Brand inverse />
          <IconButton
            label={t("shell.closeNavigation")}
            icon={<CloseIcon size={20} />}
            onClick={() => setDrawerOpen(false)}
            className="text-sidebar-foreground hover:bg-sidebar-active focus-visible:outline-sidebar-foreground"
          />
        </div>
        <nav aria-label={t("shell.mainNavigation")} className="px-3 py-4">
          <NavSections sections={sections} onNavigate={() => setDrawerOpen(false)} />
        </nav>
      </dialog>

      <div className="flex min-h-dvh flex-col lg:pl-[var(--sp-sidebar-width)]">
        <header className="sticky top-0 z-[var(--sp-z-sticky)] flex h-[var(--sp-header-height)] items-center gap-2 border-b border-border/60 bg-surface/80 px-4 backdrop-blur-xl sm:px-6">
          <IconButton
            label={t("shell.openNavigation")}
            icon={<MenuIcon size={20} />}
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className="-ml-2 lg:hidden"
          />
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LanguageMenu />
            <ThemeMenu />
            <div className="ml-2 flex items-center">{account}</div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--sp-content-max-width)] flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-10">
          <OfflineNotice />
          {children}
        </main>
      </div>
    </div>
  );
}
