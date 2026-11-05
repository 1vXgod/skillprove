import { describe, expect, it } from "vitest";
import { COMPANY_ROLE_SETS, hasCompanyRole, isPlatformAdminRole } from "./index";

describe("permissions", () => {
  it("counts only super admins and admins as platform admins", () => {
    expect(isPlatformAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isPlatformAdminRole("ADMIN")).toBe(true);
    expect(isPlatformAdminRole("SUPPORT")).toBe(false);
    expect(isPlatformAdminRole("CONTENT_REVIEWER")).toBe(false);
  });

  it("does not treat roles as a ladder", () => {
    expect(hasCompanyRole("OWNER", ["OWNER"])).toBe(true);
    expect(hasCompanyRole("OWNER", ["RECRUITER"])).toBe(false);
  });

  it("keeps management away from recruiters and reviewers", () => {
    expect(hasCompanyRole("RECRUITER", COMPANY_ROLE_SETS.manageCompany)).toBe(false);
    expect(hasCompanyRole("REVIEWER", COMPANY_ROLE_SETS.manageCompany)).toBe(false);
    expect(hasCompanyRole("REVIEWER", COMPANY_ROLE_SETS.recruit)).toBe(false);
    expect(hasCompanyRole("REVIEWER", COMPANY_ROLE_SETS.evaluate)).toBe(true);
    expect(hasCompanyRole("VIEWER", COMPANY_ROLE_SETS.evaluate)).toBe(false);
  });
  it("lets every member read assessments, only recruiting roles author them, and only owners and admins delete", () => {
    for (const role of ["OWNER", "ADMIN", "RECRUITER", "REVIEWER", "VIEWER"] as const) expect(hasCompanyRole(role, COMPANY_ROLE_SETS.readAssessments)).toBe(true);
    expect(hasCompanyRole("RECRUITER", COMPANY_ROLE_SETS.authorAssessments)).toBe(true);
    expect(hasCompanyRole("REVIEWER", COMPANY_ROLE_SETS.authorAssessments)).toBe(false);
    expect(hasCompanyRole("VIEWER", COMPANY_ROLE_SETS.authorAssessments)).toBe(false);
    expect(hasCompanyRole("RECRUITER", COMPANY_ROLE_SETS.deleteAssessments)).toBe(false);
    expect(hasCompanyRole("ADMIN", COMPANY_ROLE_SETS.deleteAssessments)).toBe(true);
  });
});
