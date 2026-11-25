"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { BriefcaseIcon, ClipboardIcon, CloseIcon, MenuIcon, PaletteIcon, SettingsIcon, SuccessIcon, UserIcon, UsersIcon } from "../icons";
import { Badge, IconButton } from "../ui";
import { navSections, type NavIcon, type NavItem, type NavSection } from "./nav";
import { LanguageMenu, ThemeMenu } from "./preference-menus";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md">
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        S
      </span>
      <span className="type-h4 tracking-tight text-foreground">SkillProve</span>
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
        const base = "flex h-10 items-center gap-3 rounded-md px-3 type-label";
        if (!href) {
          return (
            <li key={`${label}-soon`}>
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-muted-foreground/70")}>
                {content}
                <Badge className="h-5 px-2">{t("common.comingSoon")}</Badge>
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
              className={cn(base, "transition-colors duration-150", active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
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
            <h2 className="mb-1 px-3 type-caption uppercase tracking-wide text-muted-foreground">
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

      <aside className="fixed inset-y-0 left-0 hidden w-[var(--sp-sidebar-width)] flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-[var(--sp-header-height)] items-center px-5">
          <Brand />
        </div>
        <nav aria-label={t("shell.mainNavigation")} className="flex-1 overflow-y-auto px-3 py-4">
          <NavSections sections={sections} />
        </nav>
      </aside>

      <dialog
        ref={drawer}
        aria-label={t("shell.mainNavigation")}
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setDrawerOpen(false)}
        className="sp-dialog m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none border-r border-border bg-surface p-0 text-foreground lg:hidden"
      >
        <div className="flex h-[var(--sp-header-height)] items-center justify-between px-4">
          <Brand />
          <IconButton label={t("shell.closeNavigation")} icon={<CloseIcon size={20} />} onClick={() => setDrawerOpen(false)} />
        </div>
        <nav aria-label={t("shell.mainNavigation")} className="px-3 py-4">
          <NavSections sections={sections} onNavigate={() => setDrawerOpen(false)} />
        </nav>
      </dialog>

      <div className="flex min-h-dvh flex-col lg:pl-[var(--sp-sidebar-width)]">
        <header className="sticky top-0 z-[var(--sp-z-sticky)] flex h-[var(--sp-header-height)] items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
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
          {children}
        </main>
      </div>
    </div>
  );
}
