import { describe, expect, it } from "vitest";
import {
  findActiveCompanyMembership,
  findActivePlatformAdmin,
} from "../repositories/authorization";
import { anonymizeIdentity, syncIdentity } from "../repositories/identity";
import {
  createCompany,
  createCompletedEvaluation,
  createSkill,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

const subject = () => `user_${crypto.randomUUID()}`;
const email = () => `${crypto.randomUUID()}@test.invalid`;

describe.skipIf(hasNoTestDatabase)("identity synchronization", () => {
  const db = useTestDatabase();
  const logs = (targetId: string) => db.auditLog.findMany({ where: { targetId } });

  it("creates a user with no roles from a verified identity", async () => {
    const verifiedEmail = email();
    const user = await syncIdentity(db, { authSubject: subject(), verifiedEmail });

    expect(user.email).toBe(verifiedEmail);
    expect(await db.companyMember.count({ where: { userId: user.id } })).toBe(0);
    expect(await findActivePlatformAdmin(db, user.id)).toBeNull();
    expect((await logs(user.id)).map((l) => l.action)).toEqual(["identity.user_created"]);
  });

  it("does not store an unverified email", async () => {
    const user = await syncIdentity(db, { authSubject: subject(), verifiedEmail: null });
    expect(user.email).toBeNull();
  });

  it("handles duplicate deliveries with no extra rows or audit records", async () => {
    const identity = { authSubject: subject(), verifiedEmail: email() };
    const first = await syncIdentity(db, identity);
    const second = await syncIdentity(db, identity);

    expect(second.id).toBe(first.id);
    expect(await db.user.count({ where: { authSubject: identity.authSubject } })).toBe(1);
    expect(await logs(first.id)).toHaveLength(1);
  });

  it("survives concurrent deliveries for a new user", async () => {
    const identity = { authSubject: subject(), verifiedEmail: email() };
    const results = await Promise.all([syncIdentity(db, identity), syncIdentity(db, identity)]);

    expect(results[0].id).toBe(results[1].id);
    expect(await db.user.count({ where: { authSubject: identity.authSubject } })).toBe(1);
  });

  it("updates email when it changes, and clears it when no longer verified", async () => {
    const authSubject = subject();
    const user = await syncIdentity(db, { authSubject, verifiedEmail: email() });
    const changed = email();

    expect((await syncIdentity(db, { authSubject, verifiedEmail: changed })).email).toBe(changed);
    expect((await syncIdentity(db, { authSubject, verifiedEmail: null })).email).toBeNull();
    expect((await syncIdentity(db, { authSubject, verifiedEmail: null })).id).toBe(user.id);
    expect(await logs(user.id)).toHaveLength(3);
  });

  it("never merges accounts that share an email", async () => {
    const shared = email();
    const first = await syncIdentity(db, { authSubject: subject(), verifiedEmail: shared });
    const second = await syncIdentity(db, { authSubject: subject(), verifiedEmail: shared });

    expect(second.id).not.toBe(first.id);
    expect(second.email).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: first.id } })).email).toBe(shared);
    expect((await logs(second.id)).map((l) => l.action)).toContain("identity.email_conflict");
  });

  it("keeps PII out of audit records", async () => {
    const verifiedEmail = email();
    const user = await syncIdentity(db, { authSubject: subject(), verifiedEmail });
    expect(JSON.stringify(await logs(user.id))).not.toContain(verifiedEmail);
  });

  it("anonymizes a deleted account, keeping evaluation history", async () => {
    const authSubject = subject();
    const user = await syncIdentity(db, { authSubject, verifiedEmail: email() });
    const skill = await createSkill(db);
    const company = await createCompany(db);
    await db.candidateProfile.create({
      data: { userId: user.id, fullName: "To Delete", privacySettings: { create: {} } },
    });
    await db.userSkill.create({
      data: { userId: user.id, skillId: skill.id, selfReportedLevel: "EXPERT" },
    });
    await db.companyMember.create({
      data: { userId: user.id, companyId: company.id, role: "OWNER" },
    });
    await db.platformAdmin.create({ data: { userId: user.id, role: "ADMIN" } });
    const { evaluation, submitted } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
    });

    const done = await anonymizeIdentity(db, authSubject);

    expect(done).toMatchObject({ status: "ANONYMIZED", email: null, authSubject: null });
    expect(await db.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.userSkill.count({ where: { userId: user.id } })).toBe(0);
    expect(await findActiveCompanyMembership(db, user.id, company.id)).toBeNull();
    expect(await findActivePlatformAdmin(db, user.id)).toBeNull();

    const kept = await db.evaluation.findUniqueOrThrow({
      where: { id: evaluation.id },
      include: { evidence: true },
    });
    expect(kept.overallScore?.toNumber()).toBe(80);
    expect(kept.evidence[0]?.excerpt).toBeNull();
    const submission = await db.assessmentSubmission.findUniqueOrThrow({
      where: { id: submitted.submission.id },
    });
    expect(submission.responses).toBeNull();
    expect(submission.contentErasedAt).not.toBeNull();
  });

  it("treats repeated and unknown deletions as no-ops", async () => {
    const authSubject = subject();
    await syncIdentity(db, { authSubject, verifiedEmail: email() });

    expect(await anonymizeIdentity(db, authSubject)).not.toBeNull();
    expect(await anonymizeIdentity(db, authSubject)).toBeNull();
    expect(await anonymizeIdentity(db, subject())).toBeNull();
  });

  it("frees an anonymized user's email without reviving the old account", async () => {
    const authSubject = subject();
    const shared = email();
    const old = await syncIdentity(db, { authSubject, verifiedEmail: shared });
    await anonymizeIdentity(db, authSubject);

    const next = await syncIdentity(db, { authSubject: subject(), verifiedEmail: shared });
    expect(next.id).not.toBe(old.id);
    expect(next.email).toBe(shared);
  });
});

describe.skipIf(hasNoTestDatabase)("authorization lookups", () => {
  const db = useTestDatabase();

  it("checks membership status, company and deletion, not just the row", async () => {
    const user = await createUser(db);
    const [mine, other] = [await createCompany(db), await createCompany(db)];
    const member = await db.companyMember.create({
      data: { userId: user.id, companyId: mine.id, role: "RECRUITER" },
    });

    expect((await findActiveCompanyMembership(db, user.id, mine.id))?.role).toBe("RECRUITER");
    expect(await findActiveCompanyMembership(db, user.id, other.id)).toBeNull();

    await db.companyMember.update({ where: { id: member.id }, data: { status: "SUSPENDED" } });
    expect(await findActiveCompanyMembership(db, user.id, mine.id)).toBeNull();

    await db.companyMember.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
    await db.company.update({ where: { id: mine.id }, data: { deletedAt: new Date() } });
    expect(await findActiveCompanyMembership(db, user.id, mine.id)).toBeNull();
  });

  it("gives candidates no company access", async () => {
    const user = await createUser(db);
    const company = await createCompany(db);
    await db.candidateProfile.create({ data: { userId: user.id, fullName: "Candidate" } });
    expect(await findActiveCompanyMembership(db, user.id, company.id)).toBeNull();
  });

  it("ignores a revoked platform role", async () => {
    const user = await createUser(db);
    const admin = await db.platformAdmin.create({ data: { userId: user.id, role: "ADMIN" } });
    expect((await findActivePlatformAdmin(db, user.id))?.id).toBe(admin.id);

    await db.platformAdmin.update({ where: { id: admin.id }, data: { revokedAt: new Date() } });
    expect(await findActivePlatformAdmin(db, user.id)).toBeNull();
  });
});
