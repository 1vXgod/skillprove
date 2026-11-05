/** Mirrors the database enums. `REVIEWER` is the role product documents call "evaluator". */
export type CompanyRole = "OWNER" | "ADMIN" | "RECRUITER" | "REVIEWER" | "VIEWER";
export type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "CONTENT_REVIEWER";

/** The roles that count as a platform administrator. Support staff do not. */
const PLATFORM_ADMIN_ROLES: readonly PlatformRole[] = ["SUPER_ADMIN", "ADMIN"];

export function isPlatformAdminRole(role: PlatformRole): boolean {
  return PLATFORM_ADMIN_ROLES.includes(role);
}

export function hasCompanyRole(actual: CompanyRole, allowed: readonly CompanyRole[]): boolean {
  return allowed.includes(actual);
}

/** Common role sets, so routes do not repeat them. */
export const COMPANY_ROLE_SETS = {
  manageCompany: ["OWNER", "ADMIN"],
  recruit: ["OWNER", "ADMIN", "RECRUITER"],
  evaluate: ["OWNER", "ADMIN", "REVIEWER"],
  /** Every active member can read the company's assessments. */
  readAssessments: ["OWNER", "ADMIN", "RECRUITER", "REVIEWER", "VIEWER"],
  /** Create, edit, generate and publish. Reviewers and viewers cannot. */
  authorAssessments: ["OWNER", "ADMIN", "RECRUITER"],
  deleteAssessments: ["OWNER", "ADMIN"],
} as const satisfies Record<string, readonly CompanyRole[]>;
