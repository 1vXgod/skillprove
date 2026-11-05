import { describe, expect, it } from "vitest";
import { createProfile, addSectionItem } from "../repositories/candidate-profile";
import { audienceCanView, getCandidateView, getProfilePreview, resolveViewerAudience } from "../repositories/candidate-view";
import { CandidateDataError } from "../repositories/candidate-errors";
import { getSkillPassport } from "../repositories/skill-passport";
import { addSelfReportedSkill, removeSelfReportedSkill, searchSkills, updateSelfReportedSkill } from "../repositories/skills";
import { recordVerifiedSkillScore } from "../repositories/verified-skill-scores";
import {
  createCompany,
  createCompletedEvaluation,
  createPendingEvaluation,
  createPublishedAssessment,
  createSkill,
  createSubmittedAttempt,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

const profileData = {
  fullName: "Arta Krasniqi",
  headline: "Data analyst",
  biography: "Bio",
  city: "Prishtinë",
  countryCode: "XK",
  phoneNumber: "+38344123456",
  contactEmail: "arta@example.com",
  linkedinUrl: "https://linkedin.com/in/arta",
  githubUrl: null,
  websiteUrl: null,
  interests: ["Data"],
};

describe.skipIf(hasNoTestDatabase)("skill passport", () => {
  const db = useTestDatabase();

  it("keeps self-reported skills apart from verified ones, and invents nothing", async () => {
    const user = await createUser(db);
    const claimed = await createSkill(db);
    const verified = await createSkill(db);
    await addSelfReportedSkill(db, user.id, claimed.id, { level: "EXPERT", yearsOfExperience: 5 }, "en");
    await addSelfReportedSkill(db, user.id, verified.id, { level: "BEGINNER", yearsOfExperience: null }, "en");

    const before = await getSkillPassport(db, user.id, "en");
    expect(before.verified).toEqual([]);
    expect(before.selfReported.map((s) => s.skill.id).sort()).toEqual([claimed.id, verified.id].sort());

    const { evaluation } = await createCompletedEvaluation(db, { skillId: verified.id, candidateUserId: user.id, score: 72 });
    const stored = await recordVerifiedSkillScore(db, {
      userId: user.id,
      skillId: verified.id,
      score: 72,
      confidence: 64,
      highestDifficulty: "INTERMEDIATE",
      formulaVersion: "test-v1",
      evidence: [{ evaluationId: evaluation.id, weight: 100 }],
    });

    const after = await getSkillPassport(db, user.id, "en");
    expect(after.verified).toHaveLength(1);
    expect(after.verified[0]).toMatchObject({
      skill: { id: verified.id },
      score: 72,
      confidence: 64,
      assessmentCount: 1,
      highestDifficulty: "INTERMEDIATE",
      lastVerifiedAt: stored.lastVerifiedAt.toISOString(),
      evidenceStatus: "CURRENT",
      formulaVersion: "test-v1",
      evidence: [{ evaluationId: evaluation.id, assessmentTitle: "Test assessment", superseded: false }],
    });
    // The claim stays a claim, with its own level, next to the verified result.
    expect(after.selfReported.find((s) => s.skill.id === verified.id)?.level).toBe("BEGINNER");
    expect(after.verified.some((v) => v.skill.id === claimed.id)).toBe(false);
  });

  it("marks evidence outdated once its evaluation is superseded", async () => {
    const user = await createUser(db);
    const skill = await createSkill(db);
    const { evaluation, submitted, published } = await createCompletedEvaluation(db, { skillId: skill.id, candidateUserId: user.id });
    await recordVerifiedSkillScore(db, {
      userId: user.id,
      skillId: skill.id,
      score: 80,
      confidence: 70,
      highestDifficulty: "INTERMEDIATE",
      formulaVersion: "test-v1",
      evidence: [{ evaluationId: evaluation.id, weight: 100 }],
    });
    await db.evaluation.create({
      data: {
        attemptId: submitted.attempt.id,
        submissionId: submitted.submission.id,
        rubricVersionId: published.rubric.id,
        evaluatorType: "HUMAN",
        evaluatorUserId: (await createUser(db)).id,
        supersedesEvaluationId: evaluation.id,
      },
    });

    const passport = await getSkillPassport(db, user.id, "en");
    expect(passport.verified[0]?.evidenceStatus).toBe("OUTDATED");
    expect(passport.verified[0]?.evidence[0]?.superseded).toBe(true);
    // The stored score is shown as recorded, not recalculated.
    expect(passport.verified[0]?.score).toBe(80);
  });

  it("lists skills under assessment only while open or awaiting evaluation", async () => {
    const user = await createUser(db);
    const open = await createSkill(db);
    const awaiting = await createSkill(db);
    const done = await createSkill(db);
    const expired = await createSkill(db);

    const openAssessment = await createPublishedAssessment(db, { skillId: open.id });
    await db.assessmentAttempt.create({ data: { assessmentVersionId: openAssessment.version.id, rubricVersionId: openAssessment.rubric.id, candidateUserId: user.id, attemptNumber: 1 } });

    const awaitingAssessment = await createPublishedAssessment(db, { skillId: awaiting.id });
    const submitted = await createSubmittedAttempt(db, awaitingAssessment, user.id);
    await createPendingEvaluation(db, submitted, awaitingAssessment.rubric.id);

    await createCompletedEvaluation(db, { skillId: done.id, candidateUserId: user.id });

    const expiredAssessment = await createPublishedAssessment(db, { skillId: expired.id });
    await db.assessmentAttempt.create({
      data: { assessmentVersionId: expiredAssessment.version.id, rubricVersionId: expiredAssessment.rubric.id, candidateUserId: user.id, attemptNumber: 1, startedAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() - 60_000) },
    });

    const passport = await getSkillPassport(db, user.id, "en");
    const stages = Object.fromEntries(passport.inAssessment.map((entry) => [entry.skill.id, entry.attempts.map((a) => a.stage)]));
    expect(stages).toEqual({ [open.id]: ["IN_PROGRESS"], [awaiting.id]: ["AWAITING_EVALUATION"] });
    expect(passport.verified).toEqual([]);
  });

  it("only lets the candidate edit their claimed level, never a score", async () => {
    const user = await createUser(db);
    const skill = await createSkill(db);
    const added = await addSelfReportedSkill(db, user.id, skill.id, { level: "INTERMEDIATE", yearsOfExperience: 1.5 }, "en");
    const updated = await updateSelfReportedSkill(db, user.id, skill.id, { level: "ADVANCED", yearsOfExperience: 2 }, added.updatedAt, "en");
    expect(updated).toMatchObject({ level: "ADVANCED", yearsOfExperience: 2 });
    expect(await db.verifiedSkillScore.count({ where: { userId: user.id } })).toBe(0);

    await expect(updateSelfReportedSkill(db, user.id, skill.id, { level: "EXPERT", yearsOfExperience: 9 }, added.updatedAt, "en")).rejects.toMatchObject({ reason: "stale" });
    await expect(addSelfReportedSkill(db, user.id, skill.id, { level: "EXPERT", yearsOfExperience: null }, "en")).rejects.toMatchObject({ reason: "duplicate" });
    await expect(addSelfReportedSkill(db, user.id, crypto.randomUUID(), { level: "EXPERT", yearsOfExperience: null }, "en")).rejects.toBeInstanceOf(CandidateDataError);
    await removeSelfReportedSkill(db, user.id, skill.id);
    await expect(removeSelfReportedSkill(db, user.id, skill.id)).rejects.toMatchObject({ reason: "not_found" });
  });

  it("searches active skills by translated name and pages by cursor", async () => {
    const category = await db.skillCategory.create({ data: { slug: `test-cat-${crypto.randomUUID()}` } });
    const marker = crypto.randomUUID().slice(0, 8);
    for (const n of [1, 2, 3]) {
      await db.skill.create({
        data: { slug: `zz-${marker}-${n}`, categoryId: category.id, translations: { create: [{ locale: "en", name: `Searchable ${marker} ${n}` }, { locale: "sq", name: `Kërkueshme ${marker} ${n}` }] } },
      });
    }
    await db.skill.create({ data: { slug: `zz-${marker}-off`, categoryId: category.id, isActive: false, translations: { create: { locale: "en", name: `Searchable ${marker} off` } } } });

    const first = await searchSkills(db, { q: marker, locale: "sq", limit: 2 });
    expect(first.items.map((i) => i.name)).toEqual([`Kërkueshme ${marker} 1`, `Kërkueshme ${marker} 2`]);
    expect(first.nextCursor).toBe(`zz-${marker}-2`);
    const second = await searchSkills(db, { q: marker, locale: "en", limit: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items.map((i) => i.name)).toEqual([`Searchable ${marker} 3`]);
    expect(second.nextCursor).toBeNull();
  });
});

describe.skipIf(hasNoTestDatabase)("candidate visibility", () => {
  const db = useTestDatabase();

  async function memberOf(verificationStatus: "VERIFIED" | "UNVERIFIED") {
    const user = await createUser(db);
    const company = await createCompany(db);
    await db.company.update({ where: { id: company.id }, data: { verificationStatus } });
    await db.companyMember.create({ data: { companyId: company.id, userId: user.id, role: "RECRUITER" } });
    return user;
  }

  async function candidate() {
    const user = await createUser(db);
    const profile = await createProfile(db, user.id, profileData);
    return { user, profile };
  }

  async function setPrivacy(profileId: string, values: Record<string, unknown>) {
    await db.candidatePrivacySettings.update({ where: { profileId }, data: values });
  }

  it("decides access from active memberships in the database", async () => {
    const plain = await createUser(db);
    const unverified = await memberOf("UNVERIFIED");
    const verified = await memberOf("VERIFIED");
    expect(await resolveViewerAudience(db, plain.id)).toBe("AUTHENTICATED");
    expect(await resolveViewerAudience(db, unverified.id)).toBe("COMPANY");
    expect(await resolveViewerAudience(db, verified.id)).toBe("VERIFIED_COMPANY");

    const removed = await memberOf("VERIFIED");
    await db.companyMember.updateMany({ where: { userId: removed.id }, data: { status: "REMOVED", removedAt: new Date() } });
    expect(await resolveViewerAudience(db, removed.id)).toBe("AUTHENTICATED");
  });

  it("follows each visibility level", () => {
    expect(audienceCanView("PRIVATE", "VERIFIED_COMPANY")).toBe(false);
    expect(audienceCanView("VERIFIED_COMPANIES", "COMPANY")).toBe(false);
    expect(audienceCanView("VERIFIED_COMPANIES", "VERIFIED_COMPANY")).toBe(true);
    expect(audienceCanView("ALL_COMPANIES", "AUTHENTICATED")).toBe(false);
    expect(audienceCanView("ALL_COMPANIES", "COMPANY")).toBe(true);
    expect(audienceCanView("PUBLIC", "AUTHENTICATED")).toBe(true);
  });

  it("hides a private profile from every company, as if it did not exist", async () => {
    const { profile } = await candidate();
    const verified = await memberOf("VERIFIED");
    expect(await getCandidateView(db, profile.id, verified.id, "en")).toBeNull();
    expect(await getCandidateView(db, crypto.randomUUID(), verified.id, "en")).toBeNull();
  });

  it("shows a verified-companies profile only to verified company members", async () => {
    const { profile } = await candidate();
    await setPrivacy(profile.id, { visibility: "VERIFIED_COMPANIES" });
    expect(await getCandidateView(db, profile.id, (await memberOf("UNVERIFIED")).id, "en")).toBeNull();
    expect(await getCandidateView(db, profile.id, (await createUser(db)).id, "en")).toBeNull();
    expect(await getCandidateView(db, profile.id, (await memberOf("VERIFIED")).id, "en")).not.toBeNull();
  });

  it("hides every optional section until the candidate opts in", async () => {
    const { user, profile } = await candidate();
    const skill = await createSkill(db);
    await addSectionItem(db, user.id, "experiences", { title: "Analyst", companyName: "Co", employmentType: null, location: null, description: null, startDate: "2020-01-01", endDate: null, isCurrent: true });
    await addSectionItem(db, user.id, "education", { institution: "UP", degree: null, fieldOfStudy: null, description: null, startDate: null, endDate: null });
    await addSectionItem(db, user.id, "portfolio", { title: "Hidden", description: null, technologies: [], projectUrl: null, repositoryUrl: null, completedOn: null, isVisible: false });
    await addSectionItem(db, user.id, "portfolio", { title: "Shown", description: null, technologies: [], projectUrl: null, repositoryUrl: null, completedOn: null, isVisible: true });
    const { evaluation } = await createCompletedEvaluation(db, { skillId: skill.id, candidateUserId: user.id });
    await recordVerifiedSkillScore(db, { userId: user.id, skillId: skill.id, score: 90, confidence: 80, highestDifficulty: "INTERMEDIATE", formulaVersion: "test-v1", evidence: [{ evaluationId: evaluation.id, weight: 100 }] });
    await setPrivacy(profile.id, { visibility: "ALL_COMPANIES" });
    const viewer = await memberOf("UNVERIFIED");

    const hidden = await getCandidateView(db, profile.id, viewer.id, "en");
    expect(hidden).toMatchObject({ fullName: "Arta Krasniqi", location: null, contact: null, experiences: null, education: null, certificates: null, verifiedSkills: null });
    expect(hidden?.portfolio.map((p) => p.title)).toEqual(["Shown"]);
    expect(JSON.stringify(hidden)).not.toContain("arta@example.com");
    expect(JSON.stringify(hidden)).not.toContain("+38344123456");

    await setPrivacy(profile.id, { showLocation: true, showContactEmail: true, showExperience: true, showEducation: true, showVerifiedSkills: true });
    const shown = await getCandidateView(db, profile.id, viewer.id, "en");
    expect(shown?.contact).toMatchObject({ email: "arta@example.com", phoneNumber: null, linkedinUrl: "https://linkedin.com/in/arta" });
    expect(shown?.experiences).toHaveLength(1);
    expect(shown?.education).toHaveLength(1);
    expect(shown?.verifiedSkills?.[0]).toMatchObject({ score: 90, evidenceStatus: "CURRENT" });
    // Evidence would name assessments the viewer's company may not own.
    expect(shown?.verifiedSkills?.[0]).not.toHaveProperty("evidence");
    expect(JSON.stringify(shown)).not.toContain(evaluation.id);
  });

  it("hides a suspended candidate even from allowed viewers", async () => {
    const { user, profile } = await candidate();
    await setPrivacy(profile.id, { visibility: "PUBLIC" });
    const viewer = await createUser(db);
    expect(await getCandidateView(db, profile.id, viewer.id, "en")).not.toBeNull();
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    expect(await getCandidateView(db, profile.id, viewer.id, "en")).toBeNull();
  });

  it("previews the filtered view for the candidate", async () => {
    const { user } = await candidate();
    const preview = await getProfilePreview(db, user.id, "en");
    expect(preview).toMatchObject({ visibility: "PRIVATE", view: { contact: null, experiences: null } });
  });
});
