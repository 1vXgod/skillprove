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
});
