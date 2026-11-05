import { todayInKosovo } from "@skillprove/shared";
import { describe, expect, it } from "vitest";
import {
  certificateInputSchema,
  educationInputSchema,
  experienceInputSchema,
  fieldErrors,
  languageInputSchema,
  portfolioInputSchema,
  privacyInputSchema,
  profileInputSchema,
  sectionUpdateSchemas,
  selfReportedSkillInputSchema,
} from "./candidate";

const errorsOf = (schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, value: unknown) => {
  const result = schema.safeParse(value);
  if (result.success) return {};
  return fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);
};

const tomorrow = () => {
  const d = new Date(`${todayInKosovo()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

describe("profile input", () => {
  it("normalises blanks to null, email to lowercase and phone to E.164", () => {
    const parsed = profileInputSchema.parse({
      fullName: "  Arta Krasniqi ",
      headline: "",
      contactEmail: "Arta@Example.COM",
      phoneNumber: "+383 44 123 456",
      interests: ["Data", "Design"],
    });
    expect(parsed).toMatchObject({ fullName: "Arta Krasniqi", headline: null, contactEmail: "arta@example.com", phoneNumber: "+38344123456", countryCode: "XK" });
  });

  it("rejects bad URLs, emails, phones and duplicate interests", () => {
    expect(errorsOf(profileInputSchema, { fullName: "A", linkedinUrl: "javascript:alert(1)" })).toEqual({ linkedinUrl: "invalidUrl" });
    expect(errorsOf(profileInputSchema, { fullName: "A", contactEmail: "nope" })).toEqual({ contactEmail: "invalidEmail" });
    expect(errorsOf(profileInputSchema, { fullName: "A", phoneNumber: "044123" })).toEqual({ phoneNumber: "invalidPhone" });
    expect(errorsOf(profileInputSchema, { fullName: "A", interests: ["Data", "data"] })).toEqual({ interests: "duplicate" });
    expect(errorsOf(profileInputSchema, { fullName: " " })).toEqual({ fullName: "required" });
  });

  it("caps interests at 15", () => {
    const interests = Array.from({ length: 16 }, (_, i) => `Interest ${i}`);
    expect(errorsOf(profileInputSchema, { fullName: "A", interests })).toEqual({ interests: "tooMany" });
  });
});

describe("experience dates", () => {
  const base = { title: "Developer", companyName: "Co", startDate: "2020-01-01" };

  it("accepts a finished job and a current one", () => {
    expect(experienceInputSchema.safeParse({ ...base, endDate: "2022-06-30" }).success).toBe(true);
    expect(experienceInputSchema.safeParse({ ...base, isCurrent: true }).success).toBe(true);
  });

  it("rejects an end before the start, a missing end, and an end on a current job", () => {
    expect(errorsOf(experienceInputSchema, { ...base, endDate: "2019-12-31" })).toEqual({ endDate: "endBeforeStart" });
    expect(errorsOf(experienceInputSchema, base)).toEqual({ endDate: "endDateRequired" });
    expect(errorsOf(experienceInputSchema, { ...base, isCurrent: true, endDate: "2022-01-01" })).toEqual({ endDate: "currentHasEndDate" });
  });

  it("rejects future dates and malformed dates", () => {
    expect(errorsOf(experienceInputSchema, { ...base, startDate: tomorrow(), isCurrent: true })).toEqual({ startDate: "dateInFuture" });
    expect(errorsOf(experienceInputSchema, { ...base, startDate: "2020-02-30", isCurrent: true })).toEqual({ startDate: "invalidDate" });
  });
});

describe("education, certificates and portfolio", () => {
  it("allows an expected graduation in the future but not an end before the start", () => {
    expect(educationInputSchema.safeParse({ institution: "UP", startDate: "2023-10-01", endDate: tomorrow() }).success).toBe(true);
    expect(errorsOf(educationInputSchema, { institution: "UP", startDate: "2023-10-01", endDate: "2022-01-01" })).toEqual({ endDate: "endBeforeStart" });
  });

  it("requires certificates to expire after issue and not be issued in the future", () => {
    expect(errorsOf(certificateInputSchema, { name: "Cert", issuedOn: "2024-05-01", expiresOn: "2024-04-01" })).toEqual({ expiresOn: "endBeforeStart" });
    expect(errorsOf(certificateInputSchema, { name: "Cert", issuedOn: tomorrow() })).toEqual({ issuedOn: "dateInFuture" });
  });

  it("keeps portfolio items hidden unless chosen, and limits technologies", () => {
    expect(portfolioInputSchema.parse({ title: "App" }).isVisible).toBe(false);
    const technologies = Array.from({ length: 16 }, (_, i) => `Tech ${i}`);
    expect(errorsOf(portfolioInputSchema, { title: "App", technologies })).toEqual({ technologies: "tooMany" });
  });
});

describe("languages, skills and privacy", () => {
  it("accepts only the shared language codes and CEFR levels", () => {
    expect(languageInputSchema.safeParse({ languageCode: "sq", proficiency: "NATIVE" }).success).toBe(true);
    expect(errorsOf(languageInputSchema, { languageCode: "xx", proficiency: "B2" })).toEqual({ languageCode: "invalidChoice" });
    expect(errorsOf(languageInputSchema, { languageCode: "en", proficiency: "FLUENT" })).toEqual({ proficiency: "invalidChoice" });
  });

  it("lets a language update change only the level", () => {
    const parsed = sectionUpdateSchemas.languages.parse({ proficiency: "C1", languageCode: "de", expectedUpdatedAt: new Date().toISOString() });
    expect(parsed).not.toHaveProperty("languageCode");
  });

  it("has no way to send a score or verification with a self-reported skill", () => {
    const parsed = selfReportedSkillInputSchema.parse({
      skillId: "6c0b7c5e-1a7a-4c6f-9d6e-3c1b2a4d5e6f",
      level: "ADVANCED",
      yearsOfExperience: 3.5,
      score: 99,
      verified: true,
    });
    expect(parsed).toEqual({ skillId: "6c0b7c5e-1a7a-4c6f-9d6e-3c1b2a4d5e6f", level: "ADVANCED", yearsOfExperience: 3.5 });
  });

  it("requires the full privacy choice and the version being changed", () => {
    expect(errorsOf(privacyInputSchema, { visibility: "PUBLIC" })).toMatchObject({ isDiscoverable: "invalidChoice" });
    expect(errorsOf(privacyInputSchema, { visibility: "EVERYONE" })).toMatchObject({ visibility: "invalidChoice" });
  });
});
