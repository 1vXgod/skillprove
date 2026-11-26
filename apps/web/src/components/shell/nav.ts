import type { MessageKey } from "@skillprove/shared/i18n";
/** Icon names; the shell maps them to components, so this module stays free of JSX. */
export type NavIcon = "home" | "user" | "passport" | "assessments" | "account" | "candidates" | "jobs" | "designSystem";

export interface NavItem {
  label: MessageKey;
  icon: NavIcon;
  /** No href: the section is not built yet, and is shown as such rather than linked. */
  href?: string;
}

export interface NavSection {
  /** Shown above the section's items. The first section has none. */
  heading?: MessageKey;
  items: NavItem[];
}

/**
 * Candidate items first; company authoring only for company members, under its own heading, so
 * a candidate never meets "You are not a member of a company yet". This decides what is shown
 * only: the API checks membership and role on every request.
 */
export function navSections({ isCompanyMember, showDesignSystem }: { isCompanyMember: boolean; showDesignSystem: boolean }): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        { label: "nav.home", icon: "home", href: "/home" },
        { label: "nav.profile", icon: "user", href: "/profile" },
        { label: "nav.skillPassport", icon: "passport", href: "/skill-passport" },
        // Browse and take: assessments a candidate can take (company authoring is under Company).
        { label: "nav.assessments", icon: "assessments", href: "/take" },
        { label: "nav.account", icon: "account", href: "/account" },
      ],
    },
  ];
  if (isCompanyMember) {
    sections.push({
      heading: "nav.company",
      items: [
        { label: "nav.assessments", icon: "assessments", href: "/assessments" },
        { label: "nav.candidates", icon: "candidates" },
        { label: "nav.jobs", icon: "jobs" },
      ],
    });
  }
  if (showDesignSystem) sections.push({ items: [{ label: "nav.designSystem", icon: "designSystem", href: "/design-system" }] });
  return sections;
}
