import { describe, expect, it } from "vitest";
import {
  addSectionItem,
  createProfile,
  deleteProfile,
  deleteSectionItem,
  getOwnProfile,
  updatePrivacy,
  updateProfile,
  updateSectionItem,
} from "../repositories/candidate-profile";
import { CandidateDataError } from "../repositories/candidate-errors";
import { addSelfReportedSkill } from "../repositories/skills";
import { createSkill, createUser, hasNoTestDatabase, useTestDatabase } from "./support";

const profileData = (overrides: Partial<Parameters<typeof createProfile>[2]> = {}) => ({
  fullName: "Arta Krasniqi",
  headline: "Data analyst",
  biography: null,
  city: "Prishtinë",
  countryCode: "XK",
  phoneNumber: "+38344123456",
  contactEmail: "arta@example.com",
  linkedinUrl: null,
  githubUrl: null,
  websiteUrl: null,
  interests: ["Data", "Education"],
  ...overrides,
});

const experience = (overrides = {}) => ({
  title: "Analyst",
  companyName: "Past Co",
  employmentType: "FULL_TIME" as const,
  location: null,
  description: null,
  startDate: "2020-01-01",
  endDate: "2021-06-30",
  isCurrent: false,
  ...overrides,
});

const reason = (promise: Promise<unknown>) =>
  promise.then(
    () => "resolved",
    (error: unknown) => (error instanceof CandidateDataError ? error.reason : `other: ${String(error)}`),
  );

describe.skipIf(hasNoTestDatabase)("candidate profile", () => {
  const db = useTestDatabase();

  it("creates a profile with the most private defaults and audits it", async () => {
    const user = await createUser(db);
    const profile = await createProfile(db, user.id, profileData());

    expect(profile.interests).toEqual(["Data", "Education"]);
    expect(profile.availability.status).toBe("NOT_LOOKING");
    expect(profile.privacy).toMatchObject({
      visibility: "PRIVATE",
      isDiscoverable: false,
      showContactEmail: false,
      showPhoneNumber: false,
      showLocation: false,
      showExperience: false,
      showEducation: false,
      showVerifiedSkills: false,
    });
    const audit = await db.auditLog.findFirst({ where: { action: "candidate.profile_created", targetId: profile.id } });
    expect(audit).toMatchObject({ actorType: "USER", actorId: user.id, metadata: null });
  });

  it("allows one profile per user", async () => {
    const user = await createUser(db);
    await createProfile(db, user.id, profileData());
    expect(await reason(createProfile(db, user.id, profileData()))).toBe("duplicate");
  });

  it("refuses an update based on an outdated copy", async () => {
    const user = await createUser(db);
    const created = await createProfile(db, user.id, profileData());
    const updated = await updateProfile(db, user.id, { ...profileData({ headline: "Senior analyst" }), expectedUpdatedAt: created.updatedAt });
    expect(updated.headline).toBe("Senior analyst");

    // A second tab still holds the first version.
    expect(await reason(updateProfile(db, user.id, { ...profileData({ headline: "Overwrite" }), expectedUpdatedAt: created.updatedAt }))).toBe("stale");
    expect((await getOwnProfile(db, user.id))?.headline).toBe("Senior analyst");
  });

  it("reports a missing profile as not found", async () => {
    const user = await createUser(db);
    expect(await getOwnProfile(db, user.id)).toBeNull();
    expect(await reason(addSectionItem(db, user.id, "experiences", experience()))).toBe("not_found");
  });

  it("enforces list limits in the database too", async () => {
    const user = await createUser(db);
    const profile = await createProfile(db, user.id, profileData());
    const tooMany = Array.from({ length: 16 }, (_, i) => `Interest ${i}`);
    await expect(db.candidateProfile.update({ where: { id: profile.id }, data: { interests: tooMany } })).rejects.toThrow();
    await expect(db.candidateProfile.update({ where: { id: profile.id }, data: { interests: [""] } })).rejects.toThrow();
  });
});

describe.skipIf(hasNoTestDatabase)("profile sections", () => {
  const db = useTestDatabase();

  it("adds, edits and deletes experience, newest and current first", async () => {
    const user = await createUser(db);
    await createProfile(db, user.id, profileData());
    await addSectionItem(db, user.id, "experiences", experience({ title: "Oldest", startDate: "2015-01-01", endDate: "2016-01-01" }));
    const current = await addSectionItem(db, user.id, "experiences", experience({ title: "Now", startDate: "2022-01-01", endDate: null, isCurrent: true }));
    await addSectionItem(db, user.id, "experiences", experience({ title: "Middle", startDate: "2019-01-01", endDate: "2021-01-01" }));

    expect((await getOwnProfile(db, user.id))?.experiences.map((e) => e.title)).toEqual(["Now", "Middle", "Oldest"]);

    const edited = await updateSectionItem(db, user.id, "experiences", current.id, experience({ title: "Lead", startDate: "2022-01-01", endDate: "2024-01-01", isCurrent: false }), current.updatedAt);
    expect(edited).toMatchObject({ title: "Lead", isCurrent: false, endDate: "2024-01-01" });
    expect(await reason(updateSectionItem(db, user.id, "experiences", current.id, experience(), current.updatedAt))).toBe("stale");

    await deleteSectionItem(db, user.id, "experiences", current.id);
    expect((await getOwnProfile(db, user.id))?.experiences).toHaveLength(2);
  });

  it("relies on the database to reject an end before the start", async () => {
    const user = await createUser(db);
    await createProfile(db, user.id, profileData());
    await expect(addSectionItem(db, user.id, "experiences", experience({ startDate: "2022-01-01", endDate: "2021-01-01" }))).rejects.toThrow();
  });

  it("manages education, certificates, portfolio and languages", async () => {
    const user = await createUser(db);
    await createProfile(db, user.id, profileData());

    const education = await addSectionItem(db, user.id, "education", { institution: "University of Prishtina", degree: "BSc", fieldOfStudy: "Computer Science", description: null, startDate: "2016-10-01", endDate: "2020-06-30" });
    const certificate = await addSectionItem(db, user.id, "certificates", { name: "AWS Cloud Practitioner", issuer: "AWS", credentialId: "ABC-1", credentialUrl: "https://example.com/cred", issuedOn: "2023-03-01", expiresOn: "2026-03-01" });
    const project = await addSectionItem(db, user.id, "portfolio", { title: "Tracker", description: null, technologies: ["TypeScript", "PostgreSQL"], projectUrl: null, repositoryUrl: "https://github.com/x/y", completedOn: "2024-01-01", isVisible: false });
    const language = await addSectionItem(db, user.id, "languages", { languageCode: "en", proficiency: "C1" });

    expect(certificate.hasDocument).toBe(false);
    expect(project.technologies).toEqual(["TypeScript", "PostgreSQL"]);

    await updateSectionItem(db, user.id, "education", education.id, { institution: "UP", degree: "MSc", fieldOfStudy: null, description: null, startDate: null, endDate: null }, education.updatedAt);
    const updatedLanguage = await updateSectionItem(db, user.id, "languages", language.id, { proficiency: "C2" }, language.updatedAt);
    expect(updatedLanguage).toMatchObject({ languageCode: "en", proficiency: "C2" });

    expect(await reason(addSectionItem(db, user.id, "languages", { languageCode: "en", proficiency: "B1" }))).toBe("duplicate");

    const profile = await getOwnProfile(db, user.id);
    expect(profile?.education[0]?.degree).toBe("MSc");
    expect(profile?.certificates).toHaveLength(1);
    expect(profile?.portfolio).toHaveLength(1);
    expect(profile?.languages).toHaveLength(1);
  });

  it("never lets one candidate change another's records", async () => {
    const owner = await createUser(db);
    const other = await createUser(db);
    await createProfile(db, owner.id, profileData());
    await createProfile(db, other.id, profileData({ fullName: "Other" }));
    const item = await addSectionItem(db, owner.id, "experiences", experience());

    expect(await reason(updateSectionItem(db, other.id, "experiences", item.id, experience({ title: "Hijacked" }), item.updatedAt))).toBe("not_found");
    expect(await reason(deleteSectionItem(db, other.id, "experiences", item.id))).toBe("not_found");
    // The same ID under a different section is also not found.
    expect(await reason(deleteSectionItem(db, owner.id, "education", item.id))).toBe("not_found");
    expect((await getOwnProfile(db, owner.id))?.experiences[0]?.title).toBe("Analyst");
  });

  it("stops adding at the limit", async () => {
    const user = await createUser(db);
    const profile = await createProfile(db, user.id, profileData());
    await db.candidateLanguage.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({ profileId: profile.id, languageCode: `l${i}`, proficiency: "A1" as const })),
    });
    expect(await reason(addSectionItem(db, user.id, "languages", { languageCode: "sq", proficiency: "NATIVE" }))).toBe("limit");
  });

  it("deletes the profile and its sections but keeps the user's skills", async () => {
    const user = await createUser(db);
    const skill = await createSkill(db);
    const profile = await createProfile(db, user.id, profileData());
    await addSectionItem(db, user.id, "experiences", experience());
    await addSelfReportedSkill(db, user.id, skill.id, { level: "ADVANCED", yearsOfExperience: 2 }, "en");

    await deleteProfile(db, user.id);

    expect(await getOwnProfile(db, user.id)).toBeNull();
    expect(await db.candidateExperience.count({ where: { profileId: profile.id } })).toBe(0);
    expect(await db.userSkill.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "candidate.profile_deleted", targetId: profile.id } })).toBe(1);
  });
});

describe.skipIf(hasNoTestDatabase)("privacy settings", () => {
  const db = useTestDatabase();

  it("audits the fields that changed, with IDs and names only", async () => {
    const user = await createUser(db);
    const created = await createProfile(db, user.id, profileData());
    const settings = { ...created.privacy, visibility: "VERIFIED_COMPANIES" as const, showExperience: true };
    const { updatedAt, ...values } = settings;
    const updated = await updatePrivacy(db, user.id, { ...values, expectedUpdatedAt: updatedAt });

    expect(updated.privacy).toMatchObject({ visibility: "VERIFIED_COMPANIES", showExperience: true });
    const audit = await db.auditLog.findFirst({ where: { action: "candidate.privacy_updated", targetId: created.id } });
    expect(audit?.metadata).toEqual({ visibility: "VERIFIED_COMPANIES", changed: ["visibility", "showExperience"] });

    // The old copy is now stale, and saving the same values again writes no audit row.
    expect(await reason(updatePrivacy(db, user.id, { ...values, expectedUpdatedAt: updatedAt }))).toBe("stale");
    await updatePrivacy(db, user.id, { ...values, expectedUpdatedAt: updated.privacy.updatedAt });
    expect(await db.auditLog.count({ where: { action: "candidate.privacy_updated", targetId: created.id } })).toBe(1);
  });
});
