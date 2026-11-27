import type { MessageKey } from "@skillprove/shared/i18n";

/** Route names inside app/(tabs), in tab bar order. */
export type TabName = "index" | "take" | "skill-passport" | "profile" | "assessments";

export interface TabSpec {
  name: TabName;
  label: MessageKey;
  /** A Feather icon name. */
  icon: "home" | "edit-3" | "award" | "user" | "briefcase";
  /** Hidden tabs keep their route but get no button (expo-router `href: null`). */
  visible: boolean;
}

/**
 * The bottom tabs. The Company tab (assessment authoring) shows only for company members; this
 * only decides what is shown, and the API still checks membership on every request.
 */
export function tabsFor({ isCompanyMember }: { isCompanyMember: boolean }): TabSpec[] {
  return [
    { name: "index", label: "nav.home", icon: "home", visible: true },
    { name: "take", label: "nav.assessmentsTab", icon: "edit-3", visible: true },
    { name: "skill-passport", label: "nav.passportShort", icon: "award", visible: true },
    { name: "profile", label: "nav.profile", icon: "user", visible: true },
    { name: "assessments", label: "nav.company", icon: "briefcase", visible: isCompanyMember },
  ];
}
