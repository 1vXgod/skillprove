"use client";

import type { MessageKey } from "@skillprove/shared/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../lib/i18n";
import { BriefcaseIcon, ClipboardIcon, CloseIcon, MenuIcon, PaletteIcon, SettingsIcon, SuccessIcon, UserIcon, UsersIcon } from "../icons";
import { Badge, IconButton } from "../ui";
import { LanguageMenu, ThemeMenu } from "./preference-menus";

interface NavItem {
  label: MessageKey;
  icon: typeof UserIcon;
  /** No href: the section is not built yet, and is shown as such rather than linked. */
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "nav.profile", icon: UserIcon, href: "/profile" },
  { label: "nav.skillPassport", icon: SuccessIcon, href: "/skill-passport" },
  { label: "nav.account", icon: SettingsIcon, href: "/account" },
  { label: "nav.candidates", icon: UsersIcon },
  { label: "nav.assessments", icon: ClipboardIcon },
  { label: "nav.jobs", icon: BriefcaseIcon },
];

const DESIGN_SYSTEM_ITEM: NavItem = { label: "nav.designSystem", icon: PaletteIcon, href: "/design-system" };

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

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ label, icon: Icon, href }) => {
        const content = (
          <>
            <Icon size={18} />
            <span className="flex-1">{t(label)}</span>
          </>
        );
        const base = "flex h-10 items-center gap-3 rounded-md px-3 type-label";
        if (!href) {
          return (
            <li key={label}>
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-muted-foreground/70")}>
                {content}
                <Badge className="h-5 px-2">{t("common.comingSoon")}</Badge>
              </span>
            </li>
          );
        }
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={label}>
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

interface AppShellProps {
  /** The account control for the header, such as UserMenu. */
  account: ReactNode;
  /** Lists the internal design system page in navigation. */
  showDesignSystem?: boolean;
  children: ReactNode;
}

/**
 * The signed-in layout: a fixed sidebar from the lg breakpoint, and a drawer below it. The
 * drawer is a native modal dialog, so focus is trapped and Escape closes it.
 */
export function AppShell({ account, showDesignSystem = false, children }: AppShellProps) {
  const { t } = useI18n();
  const items = showDesignSystem ? [...NAV_ITEMS, DESIGN_SYSTEM_ITEM] : NAV_ITEMS;
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
          <NavList items={items} />
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
          <NavList items={items} onNavigate={() => setDrawerOpen(false)} />
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
