import { describe, expect, it } from "vitest";
import { AssessmentDataError } from "../repositories/assessment-errors";
import {
  addQuestion,
  createAssessment,
  ensureDraft,
  getAssessment,
  publishDraft,
  reorderQuestions,
  replaceRubric,
  restoreVersion,
  type QuestionRow,
} from "../repositories/assessments";
import { cancelJob, claimJob, completeJob, createGenerationJob, failJob, failStaleJobs, requeueJob } from "../repositories/ai-jobs";
import { createCompany, createSkill, createUser, hasNoTestDatabase, useTestDatabase } from "./support";

const limits = { perUserPerDay: 3, perCompanyPerDay: 5, maxConcurrentPerCompany: 2 };
const noUsage = { inputTokens: null, outputTokens: null, estimatedCost: null };

describe.skipIf(hasNoTestDatabase)("assessment generation data", () => {
  const db = useTestDatabase();

  const question = (skillId: string, prompt = "Q?"): QuestionRow => ({
    type: "SINGLE_CHOICE",
    prompt,
    options: { kind: "multiple_choice", choices: [{ id: "A", text: "a" }, { id: "B", text: "b" }] },
    answerKey: { kind: "multiple_choice", correctChoiceId: "A" },
    explanation: "because",
    skillId,
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 2,
  });
  const meta = { title: "T", description: null, instructions: "I", language: "en", difficulty: "INTERMEDIATE" as const, assessmentType: "KNOWLEDGE" as const, durationMinutes: 20 };
  const criteria = (skillId: string) => [
    { key: "a", title: "A", description: "d", weight: 70, maxScore: 10, scoringGuidance: "g", skillId },
    { key: "b", title: "B", description: "d", weight: 30, maxScore: 10, scoringGuidance: "g", skillId: null },
  ];

  async function setup() {
    const [user, company, skill] = [await createUser(db), await createCompany(db), await createSkill(db)];
    const id = await createAssessment(db, { companyId: company.id, userId: user.id, source: "HUMAN", meta, skillIds: [skill.id], questions: [question(skill.id)], criteria: criteria(skill.id) });
    return { user, company, skill, id };
  }

  it("stores the new nullable columns and keeps cross-company reads empty", async () => {
    const { company, skill, id } = await setup();
    const record = await getAssessment(db, company.id, id);
    expect(record.working.assessmentType).toBe("KNOWLEDGE");
    expect(record.working.questions[0]).toMatchObject({ skillId: skill.id, difficulty: "INTERMEDIATE", estimatedMinutes: 2, explanation: "because" });
    expect(record.working.rubrics[0]?.criteria[0]).toMatchObject({ scoringGuidance: "g" });
    const other = await createCompany(db);
    await expect(getAssessment(db, other.id, id)).rejects.toMatchObject({ reason: "not_found" });
  });

  it("allows only one open draft per assessment, even if the application check is bypassed", async () => {
    const { id, user, company } = await setup();
    await expect(db.assessmentVersion.create({ data: { assessmentId: id, version: 2, title: "x", format: "MIXED", difficulty: "BEGINNER" } })).rejects.toThrow();
    await publish(db, company.id, id, user.id);
    await ensureDraft(db, company.id, id, user.id);
    await expect(db.assessmentVersion.create({ data: { assessmentId: id, version: 3, title: "x", format: "MIXED", difficulty: "BEGINNER" } })).rejects.toThrow();
  });

  async function publish(client: typeof db, companyId: string, id: string, userId: string) {
    const record = await getAssessment(client, companyId, id);
    const weights = record.working.skills.map((s) => ({ skillId: s.skillId, weight: 100 / record.working.skills.length }));
    return publishDraft(client, companyId, id, userId, () => ({ issues: [], skillWeights: weights }));
  }

  it("publishes with an audit record, freezes content, archives the previous version and restores into a new draft", async () => {
    const { id, user, company, skill } = await setup();
    const first = await publish(db, company.id, id, user.id);
    expect(first.version).toBe(1);
    expect(await db.auditLog.count({ where: { targetId: id, action: "assessment.published", actorId: user.id } })).toBe(1);

    const frozen = await getAssessment(db, company.id, id);
    await expect(db.assessmentQuestion.update({ where: { id: frozen.working.questions[0]!.id }, data: { prompt: "x" } })).rejects.toThrow();
    await expect(db.assessmentRubricCriterion.deleteMany({ where: { rubricVersionId: frozen.working.rubrics[0]!.id } })).rejects.toThrow();
    await expect(addQuestion(db, company.id, id, question(skill.id), 30)).rejects.toMatchObject({ reason: "immutable" });
    await expect(replaceRubric(db, company.id, id, criteria(skill.id))).rejects.toMatchObject({ reason: "immutable" });

    await ensureDraft(db, company.id, id, user.id);
    await addQuestion(db, company.id, id, question(skill.id, "Second"), 30);
    const second = await publish(db, company.id, id, user.id);
    expect(second.version).toBe(2);
    const statuses = await db.assessmentVersion.findMany({ where: { assessmentId: id }, orderBy: { version: "asc" } });
    expect(statuses.map((v) => v.status)).toEqual(["ARCHIVED", "PUBLISHED"]);
    expect((await db.assessmentQuestion.count({ where: { assessmentVersionId: statuses[0]!.id } }))).toBe(1);

    const restoredVersion = await restoreVersion(db, company.id, id, statuses[0]!.id, user.id);
    expect(restoredVersion).toBe(3);
    await expect(restoreVersion(db, company.id, id, statuses[0]!.id, user.id)).rejects.toMatchObject({ reason: "draft_exists" });
  });

  it("refuses to publish a rubric whose weights do not total 100", async () => {
    const { id, user, company, skill } = await setup();
    await db.assessmentRubricCriterion.updateMany({ where: { rubricVersion: { assessmentVersion: { assessmentId: id } }, key: "b" }, data: { weight: 20 } });
    await expect(publishDraft(db, company.id, id, user.id, () => ({ issues: [], skillWeights: [{ skillId: skill.id, weight: 100 }] }))).rejects.toThrow();
    const record = await getAssessment(db, company.id, id);
    expect(record.working.status).toBe("DRAFT");
    expect(await db.auditLog.count({ where: { targetId: id, action: "assessment.published" } })).toBe(0);
    await expect(publishDraft(db, company.id, id, user.id, () => ({ issues: ["questionsRequired"], skillWeights: [] }))).rejects.toMatchObject({ reason: "not_ready" });
  });

  it("reorders questions atomically and rejects an incomplete list", async () => {
    const { id, company, skill } = await setup();
    await addQuestion(db, company.id, id, question(skill.id, "Two"), 30);
    await addQuestion(db, company.id, id, question(skill.id, "Three"), 30);
    const before = (await getAssessment(db, company.id, id)).working.questions.map((q) => q.id);
    await reorderQuestions(db, company.id, id, [...before].reverse());
    const after = (await getAssessment(db, company.id, id)).working.questions;
    expect(after.map((q) => q.id)).toEqual([...before].reverse());
    expect(after.map((q) => q.position)).toEqual([1, 2, 3]);
    await expect(reorderQuestions(db, company.id, id, before.slice(1))).rejects.toBeInstanceOf(AssessmentDataError);
    await expect(addQuestion(db, company.id, id, question(skill.id), 3)).rejects.toMatchObject({ reason: "limit" });
  });

  describe("jobs", () => {
    const create = (companyId: string, userId: string, key: string | null, payload: unknown = { n: 1 }) =>
      createGenerationJob(db, { companyId, userId, idempotencyKey: key, provider: "mock", modelName: "m", payload, limits });

    it("returns the same job for the same key and input, and rejects the same key with different input", async () => {
      const [user, company] = [await createUser(db), await createCompany(db)];
      const first = await create(company.id, user.id, "key-123456");
      const again = await create(company.id, user.id, "key-123456");
      expect(first.created).toBe(true);
      expect(again).toMatchObject({ created: false, job: { id: first.job.id } });
      await expect(create(company.id, user.id, "key-123456", { n: 2 })).rejects.toMatchObject({ reason: "job_conflict" });
      expect((await create(company.id, user.id, "key-123456", { n: 1 })).job.id).toBe(first.job.id);
      const other = await createUser(db);
      expect((await create(company.id, other.id, "key-123456")).job.id).not.toBe(first.job.id);
    });

    it("enforces per-user, per-company and concurrency limits", async () => {
      const [user, company] = [await createUser(db), await createCompany(db)];
      const jobs = [];
      for (let i = 0; i < 2; i++) jobs.push((await create(company.id, user.id, `k-${i}-aaaaaaaa`)).job);
      await expect(create(company.id, user.id, "k-3-aaaaaaaa")).rejects.toMatchObject({ reason: "rate_limited", field: "concurrent" });
      for (const job of jobs) {
        await claimJob(db, job.id);
        await failJob(db, job.id, { code: "x", message: "m" }, noUsage);
      }
      await create(company.id, user.id, "k-3-aaaaaaaa");
      await expect(create(company.id, user.id, "k-4-aaaaaaaa")).rejects.toMatchObject({ reason: "rate_limited", field: "user" });
    });

    it("moves through the lifecycle once, records usage and cost, and ignores late results after cancellation", async () => {
      const [user, company] = [await createUser(db), await createCompany(db)];
      const { job } = await create(company.id, user.id, null);
      expect(await claimJob(db, job.id)).toBe(true);
      expect(await claimJob(db, job.id)).toBe(false);
      expect(await completeJob(db, job.id, { inputTokens: 10, outputTokens: 5, estimatedCost: 0.000123 }, null, "fallback-model")).toBe(true);
      // The model that actually answered replaces the one the job started with.
      expect((await db.aIJob.findUniqueOrThrow({ where: { id: job.id } })).modelName).toBe("fallback-model");
      const done = await db.aIJob.findUniqueOrThrow({ where: { id: job.id } });
      expect(done).toMatchObject({ status: "SUCCEEDED", inputTokens: 10, outputTokens: 5 });
      expect(Number(done.estimatedCost)).toBeCloseTo(0.000123);
      await expect(cancelJob(db, job.id)).rejects.toMatchObject({ reason: "job_state" });

      const { job: second } = await create(company.id, user.id, null, { n: 2 });
      await claimJob(db, second.id);
      await cancelJob(db, second.id);
      expect(await completeJob(db, second.id, noUsage, null)).toBe(false);
      expect((await db.aIJob.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("CANCELLED");
    });

    it("limits retries and fails stale running jobs", async () => {
      const [user, company] = [await createUser(db), await createCompany(db)];
      const { job } = await create(company.id, user.id, null);
      await claimJob(db, job.id);
      await failJob(db, job.id, { code: "provider_timeout", message: "m" }, noUsage);
      await requeueJob(db, job.id, 1);
      await claimJob(db, job.id);
      await failJob(db, job.id, { code: "provider_timeout", message: "m" }, noUsage);
      await expect(requeueJob(db, job.id, 1)).rejects.toMatchObject({ reason: "retries_exhausted" });
      // A job that has not failed cannot be retried, whatever its count.
      const { job: running } = await create(company.id, user.id, null, { n: 8 });
      await claimJob(db, running.id);
      await expect(requeueJob(db, running.id, 1)).rejects.toMatchObject({ reason: "job_state" });

      const { job: stuck } = await create(company.id, user.id, null, { n: 9 });
      await claimJob(db, stuck.id, new Date(Date.now() - 3_600_000));
      await failStaleJobs(db, 60_000);
      expect(await db.aIJob.findUniqueOrThrow({ where: { id: stuck.id } })).toMatchObject({ status: "FAILED", errorCode: "timeout" });
    });

    it("rejects jobs with oversized input and negative cost at the database", async () => {
      const [user, company] = [await createUser(db), await createCompany(db)];
      await expect(db.aIJob.create({ data: { type: "ASSESSMENT_GENERATION", provider: "m", modelName: "m", companyId: company.id, requestedById: user.id, input: { big: "x".repeat(20_000) } } })).rejects.toThrow();
      await expect(db.aIJob.create({ data: { type: "ASSESSMENT_GENERATION", provider: "m", modelName: "m", estimatedCost: -1 } })).rejects.toThrow();
    });
  });
});
