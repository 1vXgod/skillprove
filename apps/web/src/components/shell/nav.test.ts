import { describe, expect, it } from "vitest";
import { navSections } from "./nav";

const summary = (options: { isCompanyMember: boolean; showDesignSystem: boolean }) =>
  navSections(options).map((s) => ({ heading: s.heading ?? null, items: s.items.map((i) => [i.label, i.href ?? null]) }));

describe("navSections", () => {
  it("shows candidates no company authoring", () => {
    const sections = summary({ isCompanyMember: false, showDesignSystem: false });
    expect(sections).toHaveLength(1);
    expect(sections.flatMap((s) => s.items).some(([, href]) => href === "/assessments")).toBe(false);
    // Home comes first; "Assessments" for candidates means browse and take.
    expect(sections[0]!.items[0]).toEqual(["nav.home", "/home"]);
    expect(sections[0]!.items).toContainEqual(["nav.assessments", "/take"]);
  });

  it("adds a Company section with authoring for company members", () => {
    const company = summary({ isCompanyMember: true, showDesignSystem: false })[1];
    expect(company).toEqual({
      heading: "nav.company",
      items: [
        ["nav.assessments", "/assessments"],
        ["nav.candidates", null],
        ["nav.jobs", null],
      ],
    });
  });

  it("puts the design system last when enabled", () => {
    expect(summary({ isCompanyMember: false, showDesignSystem: true }).at(-1)).toEqual({ heading: null, items: [["nav.designSystem", "/design-system"]] });
  });
});
