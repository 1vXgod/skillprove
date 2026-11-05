import { beforeAll, describe, expect, it } from "vitest";
import { companyScope } from "../repositories/company-scope";
import {
  createCompany,
  createCompletedEvaluation,
  createSkill,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

type Fixture = Awaited<ReturnType<typeof createCompletedEvaluation>>;

describe.skipIf(hasNoTestDatabase)("company isolation", () => {
  const db = useTestDatabase();
  let companyA: string;
  let companyB: string;
  let dataA: Fixture;
  let dataB: Fixture;
  let platform: Fixture;
  let invitationA: string;
  let userA: string;

  beforeAll(async () => {
    const skill = await createSkill(db);
    const candidate = await createUser(db);
    companyA = (await createCompany(db)).id;
    companyB = (await createCompany(db)).id;
    userA = (await createUser(db)).id;
    await db.companyMember.create({ data: { companyId: companyA, userId: userA, role: "OWNER" } });

    const base = { skillId: skill.id, candidateUserId: candidate.id };
    dataA = await createCompletedEvaluation(db, { ...base, companyId: companyA });
    dataB = await createCompletedEvaluation(db, { ...base, companyId: companyB });
    platform = await createCompletedEvaluation(db, base);

    invitationA = (
      await db.companyInvitation.create({
        data: {
          companyId: companyA,
          email: "invitee@test.invalid",
          role: "VIEWER",
          tokenHash: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      })
    ).id;
    await db.auditLog.create({ data: { action: "test.company_a", companyId: companyA } });
  });

  it("returns another company's records as null", async () => {
    const scope = companyScope(db, companyB);

    expect(await scope.getAssessment(dataA.published.assessment.id)).toBeNull();
    expect(await scope.getAttempt(dataA.submitted.attempt.id)).toBeNull();
    expect(await scope.getSubmission(dataA.submitted.submission.id)).toBeNull();
    expect(await scope.getEvaluation(dataA.evaluation.id)).toBeNull();
  });

  it("returns the company's own records", async () => {
    const scope = companyScope(db, companyA);

    expect((await scope.getAssessment(dataA.published.assessment.id))?.id).toBeDefined();
    expect((await scope.getAttempt(dataA.submitted.attempt.id))?.id).toBeDefined();
    expect((await scope.getSubmission(dataA.submitted.submission.id))?.id).toBeDefined();
    const evaluation = await scope.getEvaluation(dataA.evaluation.id);
    expect(evaluation?.criterionScores).toHaveLength(1);
    expect(evaluation?.evidence).toHaveLength(1);
  });

  it("keeps each list inside its company", async () => {
    const scope = companyScope(db, companyB);

    expect((await scope.listAssessments()).map((a) => a.id)).toEqual([
      dataB.published.assessment.id,
    ]);
    expect((await scope.listAttempts()).map((a) => a.id)).toEqual([dataB.submitted.attempt.id]);
    expect(await scope.listMembers()).toEqual([]);
    expect(await scope.listInvitations()).toEqual([]);
    expect(await scope.listAuditLogs()).toEqual([]);

    const own = companyScope(db, companyA);
    expect((await own.listInvitations()).map((i) => i.id)).toEqual([invitationA]);
    expect((await own.listMembers()).map((m) => m.userId)).toEqual([userA]);
    expect(await own.listAuditLogs()).toHaveLength(1);
  });

  it("does not expose a candidate's platform work to any company", async () => {
    const scope = companyScope(db, companyA);

    expect(await scope.getAssessment(platform.published.assessment.id)).toBeNull();
    expect(await scope.getSubmission(platform.submitted.submission.id)).toBeNull();
    expect(await scope.getEvaluation(platform.evaluation.id)).toBeNull();
  });

  it("hides soft-deleted assessments", async () => {
    const skill = await createSkill(db);
    const candidate = await createUser(db);
    const company = (await createCompany(db)).id;
    const data = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: candidate.id,
      companyId: company,
    });
    await db.assessment.update({
      where: { id: data.published.assessment.id },
      data: { deletedAt: new Date() },
    });

    const scope = companyScope(db, company);
    expect(await scope.getAssessment(data.published.assessment.id)).toBeNull();
    expect(await scope.listAssessments()).toEqual([]);
  });

  it("does not delete a company that still owns data", async () => {
    await expect(db.company.delete({ where: { id: companyA } })).rejects.toThrow();
  });

  it("does not let a superseding evaluation cross attempts or companies", async () => {
    await expect(
      db.evaluation.create({
        data: {
          attemptId: dataB.submitted.attempt.id,
          submissionId: dataB.submitted.submission.id,
          rubricVersionId: dataB.published.rubric.id,
          evaluatorType: "AI",
          provider: "p",
          modelName: "m",
          supersedesEvaluationId: dataA.evaluation.id,
        },
      }),
    ).rejects.toThrow(/same attempt/);
  });

  it("does not let evidence point at another evaluation's score", async () => {
    await expect(
      db.evaluationEvidence.create({
        data: {
          evaluationId: dataB.evaluation.id,
          criterionScoreId: dataA.criterionScore.id,
          excerpt: "Crossed",
        },
      }),
    ).rejects.toThrow();
  });
});
