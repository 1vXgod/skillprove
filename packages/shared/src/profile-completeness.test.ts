import { describe, expect, it } from "vitest";
import { getMessages } from "./i18n";
import { PROFILE_COMPLETENESS_ITEMS, profileCompleteness, type CompletenessProfile } from "./profile-completeness";

const empty: CompletenessProfile = {
  headline: null,
  biography: null,
  city: null,
  experiences: [],
  education: [],
  languages: [],
  availability: { employmentTypes: [], workModes: [] },
};
const full: CompletenessProfile = {
  headline: "Data analyst",
  biography: "I work with data.",
  city: "Prishtinë",
  experiences: [{}],
  education: [{}],
  languages: [{}],
  availability: { employmentTypes: ["FULL_TIME"], workModes: [] },
};

describe("profileCompleteness", () => {
  it("asks for a profile first when there is none", () => {
    const result = profileCompleteness(null, 0);
    expect(result.percent).toBe(0);
    expect(result.next).toBe("profile");
    expect(result.missing).toEqual([...PROFILE_COMPLETENESS_ITEMS]);
  });

  it("counts skills from the Skill Passport even before a profile exists", () => {
    expect(profileCompleteness(null, 2).done).toEqual(["skills"]);
  });

  it("gives a new, empty profile credit only for existing", () => {
    const result = profileCompleteness(empty, 0);
    expect(result.done).toEqual(["profile"]);
    expect(result.percent).toBe(11);
    expect(result.next).toBe("headline");
  });

  it("suggests the missing items in order", () => {
    expect(profileCompleteness({ ...empty, headline: "Analyst" }, 0).next).toBe("skills");
    expect(profileCompleteness({ ...empty, headline: "Analyst" }, 1).next).toBe("experience");
  });

  it("does not count blank text", () => {
    expect(profileCompleteness({ ...full, headline: "   ", city: "" }, 1).missing).toEqual(["headline", "location"]);
  });

  it("counts work preferences when either a work mode or an employment type is chosen", () => {
    expect(profileCompleteness({ ...full, availability: { employmentTypes: [], workModes: ["REMOTE"] } }, 1).missing).toEqual([]);
    expect(profileCompleteness({ ...full, availability: { employmentTypes: [], workModes: [] } }, 1).missing).toEqual(["preferences"]);
  });

  it("is 100% with nothing next when everything is there", () => {
    expect(profileCompleteness(full, 3)).toMatchObject({ percent: 100, missing: [], next: null });
  });

  it("has a label for every item in both languages", () => {
    for (const locale of ["sq", "en"] as const) {
      const items = getMessages(locale).completeness.items as Record<string, string>;
      expect(Object.keys(items).sort()).toEqual([...PROFILE_COMPLETENESS_ITEMS].sort());
    }
  });
});
