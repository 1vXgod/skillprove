import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { AiProviderError } from "@skillprove/ai";
import { buildValidGeneratedAssessment, jsonResponse, MockAiProvider } from "@skillprove/ai/testing";
import { createPrismaClient, type PrismaClient } from "@skillprove/database";
import {
  aiJobSchema,
  assessmentDetailSchema,
  assessmentListSchema,
  type GenerationRequest,
} from "@skillprove/validation";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkForTests } from "../../../lib/auth/clerk";
import { POST as cancelJobRoute } from "./ai/jobs/[jobId]/cancel/route";
import { GET as getJobRoute } from "./ai/jobs/[jobId]/route";
import { POST as retryJobRoute } from "./ai/jobs/[jobId]/retry/route";
import { DELETE as deleteAssessment, GET as getAssessmentRoute, PUT as putAssessment } from "./assessments/[assessmentId]/route";
import { POST as postDraft } from "./assessments/[assessmentId]/draft/route";
import { GET as getPreview } from "./assessments/[assessmentId]/preview/route";
import { POST as publishRoute } from "./assessments/[assessmentId]/publish/route";
import { POST as postQuestion } from "./assessments/[assessmentId]/questions/route";
import { PUT as reorderRoute } from "./assessments/[assessmentId]/questions/reorder/route";
import { DELETE as deleteQuestionRoute, PUT as putQuestion } from "./assessments/[assessmentId]/questions/[questionId]/route";
import { POST as regenerateRoute } from "./assessments/[assessmentId]/questions/[questionId]/regenerate/route";
import { GET as getRubric, PUT as putRubric } from "./assessments/[assessmentId]/rubric/route";
import { GET as getVersions } from "./assessments/[assessmentId]/versions/route";
import { POST as restoreRoute } from "./assessments/[assessmentId]/versions/[versionId]/restore/route";
import { GET as listAssessmentsRoute, POST as createAssessmentRoute } from "./companies/[companyId]/assessments/route";
import { POST as generateRoute } from "./companies/[companyId]/assessments/generate/route";

/**
 * Real route handlers, guards, repositories and database triggers against a local database,
 * with a deterministic mock AI provider. Gemini is never contacted.
 */
const url = process.env.TEST_DATABASE_URL;
const isLocal = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Refusing to run API database tests against a non-local database. See docs/database.md.");
  }
  return true;
})();

const holder = vi.hoisted(() => ({
  db: null as PrismaClient | null,
  provider: null as unknown,
  tasks: [] as Promise<void>[],
}));
vi.mock("../../../lib/db", () => ({ getDb: () => holder.db }));
vi.mock("../../../lib/ai/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/ai/provider")>()),
  getAiProvider: () => holder.provider,
}));
vi.mock("../../../lib/ai/schedule", () => ({
  runInBackground: (task: () => Promise<void>) => {
    holder.tasks.push(task());
  },
}));

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ISSUER = "https://test-instance.clerk.accounts.dev";
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function tokenFor(subject: string) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT", kid: "k" })}.${encode({ iss: ISSUER, sub: subject, sid: "sess", iat: now - 5, nbf: now - 5, exp: now + 120 })}`;
  return `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(privateKey).toString("base64url")}`;
}

type Handler = (request: Request, context: never) => Promise<Response>;
// Responses are checked field by field in tests, so loose typing is deliberate here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { success: boolean; data?: any; error?: { code: string; message: string; fields?: Record<string, string> } };

async function call(
  handler: Handler,
  options: { token?: string; method?: string; body?: unknown; params?: Record<string, string>; query?: string; headers?: Record<string, string> } = {},
) {
  const request = new Request(`http://localhost:4000/api/v1/test${options.query ?? ""}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) } as never);
  return { status: response.status, body: (await response.json()) as Body };
}

const savedEnv = { ...process.env };

describe.skipIf(!isLocal)("assessment API routes", () => {
  beforeAll(() => {
    process.env.CLERK_SECRET_KEY = "test-only-not-a-real-secret";
    process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("test-instance.clerk.accounts.dev$").toString("base64")}`;
    process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.GENERATION_MAX_PROVIDER_ATTEMPTS = "2";
    resetClerkForTests();
    holder.db = createPrismaClient(url ?? "");
  });
  afterAll(async () => {
    await holder.db?.$disconnect();
    process.env = savedEnv;
    resetClerkForTests();
  });
  beforeEach(() => {
    holder.provider = null;
    holder.tasks = [];
  });

  const db = () => holder.db as PrismaClient;
  const settle = async () => {
    await Promise.all(holder.tasks);
    holder.tasks = [];
  };

  async function signedInUser() {
    const subject = `user_${randomUUID().replaceAll("-", "")}`;
    const user = await db().user.create({ data: { authSubject: subject, email: `${randomUUID()}@test.invalid` } });
    return { user, token: tokenFor(subject) };
  }
  async function companyWith(role: "OWNER" | "ADMIN" | "RECRUITER" | "REVIEWER" | "VIEWER") {
    const member = await signedInUser();
    const company = await db().company.create({ data: { name: "Co", slug: `co-${randomUUID()}` } });
    await db().companyMember.create({ data: { companyId: company.id, userId: member.user.id, role } });
    return { ...member, company };
  }
  async function joinCompany(companyId: string, role: "OWNER" | "ADMIN" | "RECRUITER" | "REVIEWER" | "VIEWER") {
    const member = await signedInUser();
    await db().companyMember.create({ data: { companyId, userId: member.user.id, role } });
    return member;
  }
  async function makeSkills(n: number) {
    const category = await db().skillCategory.create({ data: { slug: `t-${randomUUID()}` } });
    return Promise.all(Array.from({ length: n }, () => db().skill.create({ data: { slug: `t-${randomUUID()}`, categoryId: category.id } })));
  }

  const manualBody = (skillIds: string[]) => ({
    title: "Backend basics",
    description: "Checks core ideas.",
    instructions: "Answer every question.",
    skillIds,
    difficulty: "INTERMEDIATE",
    assessmentType: "KNOWLEDGE",
    durationMinutes: 30,
    language: "en",
  });
  const choiceQuestion = (skillId: string, prompt = "Which is right?") => ({
    kind: "multiple_choice",
    prompt,
    choices: [
      { id: "A", text: "One" },
      { id: "B", text: "Two" },
    ],
    correctChoiceId: "B",
    explanation: "B is right because it is.",
    skillId,
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 2,
  });
  const rubricFor = (skillId: string) => ({
    criteria: [
      { key: "accuracy", title: "Accuracy", description: "Correctness.", maxScore: 10, weight: 60, scoringGuidance: "0-3 weak, 8-10 strong.", skillId },
      { key: "clarity", title: "Clarity", description: "Clear writing.", maxScore: 10, weight: 40, scoringGuidance: "0-3 weak, 8-10 strong.", skillId: null },
    ],
  });

  async function createManual(token: string, companyId: string, skillIds: string[]) {
    const res = await call(createAssessmentRoute as Handler, { token, method: "POST", params: { companyId }, body: manualBody(skillIds) });
    expect(res.status).toBe(201);
    return assessmentDetailSchema.parse(res.body.data);
  }
  const A = (id: string) => ({ assessmentId: id });

  /** A manual assessment with one question and a rubric, ready to publish. */
  async function readyAssessment(token: string, companyId: string) {
    const [skill] = await makeSkills(1);
    const draft = await createManual(token, companyId, [skill!.id]);
    expect((await call(postQuestion as Handler, { token, method: "POST", params: A(draft.id), body: choiceQuestion(skill!.id) })).status).toBe(201);
    expect((await call(putRubric as Handler, { token, method: "PUT", params: A(draft.id), body: rubricFor(skill!.id) })).status).toBe(200);
    return { id: draft.id, skillId: skill!.id };
  }

  const request = (skillIds: string[], extra: Partial<GenerationRequest> = {}): GenerationRequest => ({
    title: null,
    description: null,
    skills: skillIds.map((skillId) => ({ skillId, expectedLevel: "INTERMEDIATE" as const })),
    difficulty: "INTERMEDIATE",
    assessmentType: "KNOWLEDGE",
    questionCount: 4,
    durationMinutes: 40,
    language: "en",
    additionalInstructions: null,
    ...extra,
  });

  // -------------------------------------------------------------------------
  describe("manual creation, editing and versioning", () => {
    it("creates a draft, adds and edits questions, reorders and publishes", async () => {
      const { token, company } = await companyWith("RECRUITER");
      const [skill] = await makeSkills(1);
      const draft = await createManual(token, company.id, [skill!.id]);
      expect(draft).toMatchObject({ creationSource: "HUMAN", hasOpenDraft: true, hasPublishedVersion: false, version: { version: 1, status: "DRAFT" } });
      expect(draft.publishIssues).toEqual(expect.arrayContaining(["questionsRequired", "rubricRequired"]));

      const first = await call(postQuestion as Handler, { token, method: "POST", params: A(draft.id), body: choiceQuestion(skill!.id, "First?") });
      const second = await call(postQuestion as Handler, {
        token,
        method: "POST",
        params: A(draft.id),
        body: { kind: "scenario", scenario: "A team ships late.", task: "What do you do?", expectedCriteria: ["Names the risk"], skillId: skill!.id, difficulty: "BEGINNER", estimatedMinutes: 5 },
      });
      const afterAdd = assessmentDetailSchema.parse(second.body.data);
      expect(afterAdd.questions.map((q) => q.kind)).toEqual(["multiple_choice", "scenario"]);
      const [q1, q2] = afterAdd.questions;
      void first;

      const edited = await call(putQuestion as Handler, { token, method: "PUT", params: { ...A(draft.id), questionId: q1!.id }, body: choiceQuestion(skill!.id, "Edited?") });
      expect(assessmentDetailSchema.parse(edited.body.data).questions[0]).toMatchObject({ prompt: "Edited?" });

      const reordered = await call(reorderRoute as Handler, { token, method: "PUT", params: A(draft.id), body: { questionIds: [q2!.id, q1!.id] } });
      expect(assessmentDetailSchema.parse(reordered.body.data).questions.map((q) => q.id)).toEqual([q2!.id, q1!.id]);
      expect((await call(reorderRoute as Handler, { token, method: "PUT", params: A(draft.id), body: { questionIds: [q1!.id] } })).status).toBe(400);

      const removed = await call(deleteQuestionRoute as Handler, { token, method: "DELETE", params: { ...A(draft.id), questionId: q2!.id } });
      expect(assessmentDetailSchema.parse(removed.body.data).questions.map((q) => q.position)).toEqual([1]);

      expect((await call(putRubric as Handler, { token, method: "PUT", params: A(draft.id), body: rubricFor(skill!.id) })).status).toBe(200);
      const published = await call(publishRoute as Handler, { token, method: "POST", params: A(draft.id) });
      expect(published.status).toBe(200);
      expect(published.body.data).toMatchObject({ version: 1 });

      const audit = await db().auditLog.findMany({ where: { targetId: draft.id, action: "assessment.published" } });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorId: expect.any(String), companyId: company.id });
    });

    it("refuses to publish an incomplete draft and lists why", async () => {
      const { token, company } = await companyWith("OWNER");
      const [skill] = await makeSkills(1);
      const draft = await createManual(token, company.id, [skill!.id]);
      const res = await call(publishRoute as Handler, { token, method: "POST", params: A(draft.id) });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.error?.fields ?? {})).toEqual(expect.arrayContaining(["questionsRequired", "rubricRequired"]));
      expect((await call(getVersions as Handler, { token, params: A(draft.id) })).body.data.items[0].status).toBe("DRAFT");
    });

    it("rejects rubrics whose weights do not total 100", async () => {
      const { token, company } = await companyWith("OWNER");
      const [skill] = await makeSkills(1);
      const draft = await createManual(token, company.id, [skill!.id]);
      const bad = rubricFor(skill!.id);
      bad.criteria[0]!.weight = 50;
      const res = await call(putRubric as Handler, { token, method: "PUT", params: A(draft.id), body: bad });
      expect(res.status).toBe(400);
      expect(res.body.error?.fields).toEqual({ criteria: "weightsMustTotal100" });
      const [other] = await makeSkills(1);
      const foreign = rubricFor(other!.id);
      expect((await call(putRubric as Handler, { token, method: "PUT", params: A(draft.id), body: foreign })).status).toBe(400);
    });

    it("freezes published versions, and editing creates a new draft without touching history", async () => {
      const { token, company } = await companyWith("ADMIN");
      const { id, skillId } = await readyAssessment(token, company.id);
      await call(publishRoute as Handler, { token, method: "POST", params: A(id) });

      // Every edit route refuses a published version.
      const detail = assessmentDetailSchema.parse((await call(getAssessmentRoute as Handler, { token, params: A(id) })).body.data);
      expect(detail).toMatchObject({ hasOpenDraft: false, hasPublishedVersion: true, publishIssues: [] });
      const q = detail.questions[0]!;
      for (const res of [
        await call(putAssessment as Handler, { token, method: "PUT", params: A(id), body: { title: "x", expectedUpdatedAt: detail.version.updatedAt } }),
        await call(postQuestion as Handler, { token, method: "POST", params: A(id), body: choiceQuestion(skillId) }),
        await call(putQuestion as Handler, { token, method: "PUT", params: { ...A(id), questionId: q.id }, body: choiceQuestion(skillId, "Changed") }),
        await call(deleteQuestionRoute as Handler, { token, method: "DELETE", params: { ...A(id), questionId: q.id } }),
        await call(putRubric as Handler, { token, method: "PUT", params: A(id), body: rubricFor(skillId) }),
      ]) {
        expect(res.status).toBe(409);
      }

      // The database triggers also refuse a write that bypasses the API.
      await expect(db().assessmentQuestion.update({ where: { id: q.id }, data: { prompt: "tampered" } })).rejects.toThrow();
      await expect(db().assessmentVersion.update({ where: { id: detail.version.id }, data: { title: "tampered" } })).rejects.toThrow();

      const drafted = await call(postDraft as Handler, { token, method: "POST", params: A(id) });
      expect(drafted.status).toBe(201);
      const newDraft = assessmentDetailSchema.parse(drafted.body.data);
      expect(newDraft).toMatchObject({ hasOpenDraft: true, version: { version: 2, status: "DRAFT" } });
      expect(newDraft.questions[0]?.id).not.toBe(q.id);
      expect((await call(postDraft as Handler, { token, method: "POST", params: A(id) })).status).toBe(200);

      await call(putAssessment as Handler, { token, method: "PUT", params: A(id), body: { title: "Version two", expectedUpdatedAt: newDraft.version.updatedAt } });
      const stale = await call(putAssessment as Handler, { token, method: "PUT", params: A(id), body: { title: "Lost update", expectedUpdatedAt: newDraft.version.updatedAt } });
      expect(stale.status).toBe(409);

      const original = await db().assessmentVersion.findFirstOrThrow({ where: { id: detail.version.id } });
      expect(original).toMatchObject({ title: "Backend basics", status: "PUBLISHED" });

      // Publishing version 2 archives version 1 and keeps both.
      expect((await call(publishRoute as Handler, { token, method: "POST", params: A(id) })).status).toBe(200);
      const versions = (await call(getVersions as Handler, { token, params: A(id) })).body.data.items as { version: number; status: string }[];
      expect(versions.map((v) => [v.version, v.status])).toEqual([[2, "PUBLISHED"], [1, "ARCHIVED"]]);
    });

    it("restores an earlier version into a new draft, only when no draft is open", async () => {
      const { token, company } = await companyWith("OWNER");
      const { id } = await readyAssessment(token, company.id);
      await call(publishRoute as Handler, { token, method: "POST", params: A(id) });
      const v1 = (await call(getVersions as Handler, { token, params: A(id) })).body.data.items[0].id as string;

      const restored = await call(restoreRoute as Handler, { token, method: "POST", params: { ...A(id), versionId: v1 } });
      expect(restored.status).toBe(201);
      expect(assessmentDetailSchema.parse(restored.body.data).version).toMatchObject({ version: 2, status: "DRAFT" });
      expect((await call(restoreRoute as Handler, { token, method: "POST", params: { ...A(id), versionId: v1 } })).status).toBe(409);
      expect((await call(restoreRoute as Handler, { token, method: "POST", params: { ...A(id), versionId: randomUUID() } })).status).toBe(409);
    });

    it("previews the candidate view without answers", async () => {
      const { token, company } = await companyWith("RECRUITER");
      const { id } = await readyAssessment(token, company.id);
      const res = await call(getPreview as Handler, { token, params: A(id) });
      const text = JSON.stringify(res.body.data);
      expect(res.body.data.questions).toHaveLength(1);
      expect(text).not.toContain("correctChoiceId");
      expect(text).not.toContain("explanation");
      expect(text).not.toContain("B is right");
      const rubric = (await call(getRubric as Handler, { token, params: A(id) })).body.data;
      expect(rubric.criteria).toHaveLength(2);
    });

    it("lists with pagination and soft-deletes", async () => {
      const { token, company } = await companyWith("OWNER");
      const [skill] = await makeSkills(1);
      for (let i = 0; i < 3; i++) await createManual(token, company.id, [skill!.id]);
      const page = assessmentListSchema.parse((await call(listAssessmentsRoute as Handler, { token, params: { companyId: company.id }, query: "?page=1&pageSize=2" })).body.data);
      expect(page).toMatchObject({ total: 3, page: 1, pageSize: 2 });
      expect(page.items).toHaveLength(2);
      expect((await call(listAssessmentsRoute as Handler, { token, params: { companyId: company.id }, query: "?pageSize=500" })).status).toBe(400);

      const id = page.items[0]!.id;
      expect((await call(deleteAssessment as Handler, { token, method: "DELETE", params: A(id) })).status).toBe(200);
      expect((await call(getAssessmentRoute as Handler, { token, params: A(id) })).status).toBe(403);
      expect(assessmentListSchema.parse((await call(listAssessmentsRoute as Handler, { token, params: { companyId: company.id } })).body.data).total).toBe(2);
      expect(await db().auditLog.count({ where: { targetId: id, action: "assessment.deleted" } })).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("access control", () => {
    it("requires a session", async () => {
      expect((await call(getAssessmentRoute as Handler, { params: A(randomUUID()) })).status).toBe(401);
      expect((await call(generateRoute as Handler, { method: "POST", params: { companyId: randomUUID() }, body: {} })).status).toBe(401);
    });

    it("keeps one company's assessments from another company's members, including multi-company users", async () => {
      const a = await companyWith("OWNER");
      const b = await companyWith("OWNER");
      const { id, skillId } = await readyAssessment(a.token, a.company.id);

      const attempts = [
        await call(getAssessmentRoute as Handler, { token: b.token, params: A(id) }),
        await call(putAssessment as Handler, { token: b.token, method: "PUT", params: A(id), body: { title: "x", expectedUpdatedAt: new Date().toISOString() } }),
        await call(deleteAssessment as Handler, { token: b.token, method: "DELETE", params: A(id) }),
        await call(publishRoute as Handler, { token: b.token, method: "POST", params: A(id) }),
        await call(postQuestion as Handler, { token: b.token, method: "POST", params: A(id), body: choiceQuestion(skillId) }),
        await call(getVersions as Handler, { token: b.token, params: A(id) }),
        await call(getPreview as Handler, { token: b.token, params: A(id) }),
        await call(getRubric as Handler, { token: b.token, params: A(id) }),
        await call(listAssessmentsRoute as Handler, { token: b.token, params: { companyId: a.company.id } }),
        await call(createAssessmentRoute as Handler, { token: b.token, method: "POST", params: { companyId: a.company.id }, body: manualBody([skillId]) }),
        await call(generateRoute as Handler, { token: b.token, method: "POST", params: { companyId: a.company.id }, body: request([skillId]) }),
      ];
      for (const res of attempts) {
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      }
      // Same response for an assessment that does not exist, so existence is not revealed.
      expect((await call(getAssessmentRoute as Handler, { token: b.token, params: A(randomUUID()) })).status).toBe(403);

      // A user in both companies only gets what each membership allows.
      await db().companyMember.create({ data: { companyId: b.company.id, userId: a.user.id, role: "VIEWER" } });
      expect((await call(getAssessmentRoute as Handler, { token: a.token, params: A(id) })).status).toBe(200);
      const own = await createManual(a.token, a.company.id, [skillId]);
      // Posting to B's company with only a VIEWER role there is refused, even though they own A.
      expect((await call(createAssessmentRoute as Handler, { token: a.token, method: "POST", params: { companyId: b.company.id }, body: manualBody([skillId]) })).status).toBe(403);
      expect(own.companyId).toBe(a.company.id);
    });

    it("limits roles: viewers and reviewers read, recruiters author, only owners and admins delete", async () => {
      const owner = await companyWith("OWNER");
      const { id, skillId } = await readyAssessment(owner.token, owner.company.id);
      const viewer = await joinCompany(owner.company.id, "VIEWER");
      const reviewer = await joinCompany(owner.company.id, "REVIEWER");
      const recruiter = await joinCompany(owner.company.id, "RECRUITER");

      for (const member of [viewer, reviewer, recruiter]) expect((await call(getAssessmentRoute as Handler, { token: member.token, params: A(id) })).status).toBe(200);
      for (const member of [viewer, reviewer]) {
        expect((await call(createAssessmentRoute as Handler, { token: member.token, method: "POST", params: { companyId: owner.company.id }, body: manualBody([skillId]) })).status).toBe(403);
        expect((await call(postQuestion as Handler, { token: member.token, method: "POST", params: A(id), body: choiceQuestion(skillId) })).status).toBe(403);
        expect((await call(publishRoute as Handler, { token: member.token, method: "POST", params: A(id) })).status).toBe(403);
        expect((await call(generateRoute as Handler, { token: member.token, method: "POST", params: { companyId: owner.company.id }, body: request([skillId]) })).status).toBe(403);
      }
      expect((await call(deleteAssessment as Handler, { token: recruiter.token, method: "DELETE", params: A(id) })).status).toBe(403);
      expect((await call(deleteAssessment as Handler, { token: owner.token, method: "DELETE", params: A(id) })).status).toBe(200);
    });

    it("keeps candidates and removed members out", async () => {
      const owner = await companyWith("OWNER");
      const { id, skillId } = await readyAssessment(owner.token, owner.company.id);
      const candidate = await signedInUser();
      await db().candidateProfile.create({ data: { userId: candidate.user.id, fullName: "Cand Idate" } });
      expect((await call(getAssessmentRoute as Handler, { token: candidate.token, params: A(id) })).status).toBe(403);
      expect((await call(createAssessmentRoute as Handler, { token: candidate.token, method: "POST", params: { companyId: owner.company.id }, body: manualBody([skillId]) })).status).toBe(403);

      const leaver = await joinCompany(owner.company.id, "RECRUITER");
      await db().companyMember.updateMany({ where: { userId: leaver.user.id }, data: { status: "REMOVED" } });
      expect((await call(getAssessmentRoute as Handler, { token: leaver.token, params: A(id) })).status).toBe(403);
    });

    it("lets a platform administrator read but not edit", async () => {
      const owner = await companyWith("OWNER");
      const { id } = await readyAssessment(owner.token, owner.company.id);
      const admin = await signedInUser();
      await db().platformAdmin.create({ data: { userId: admin.user.id, role: "ADMIN" } });
      expect((await call(getAssessmentRoute as Handler, { token: admin.token, params: A(id) })).status).toBe(200);
      expect((await call(publishRoute as Handler, { token: admin.token, method: "POST", params: A(id) })).status).toBe(403);
      expect((await call(deleteAssessment as Handler, { token: admin.token, method: "DELETE", params: A(id) })).status).toBe(403);
    });

    it("validates request bodies on the server", async () => {
      const { token, company } = await companyWith("OWNER");
      const res = await call(createAssessmentRoute as Handler, { token, method: "POST", params: { companyId: company.id }, body: { ...manualBody([randomUUID()]), title: "", durationMinutes: 9999, difficulty: "EXPERT" } });
      expect(res.status).toBe(400);
      expect(res.body.error?.fields).toMatchObject({ title: "required", durationMinutes: "invalidNumber", difficulty: "invalidChoice" });
      const unknownSkill = await call(createAssessmentRoute as Handler, { token, method: "POST", params: { companyId: company.id }, body: manualBody([randomUUID()]) });
      expect(unknownSkill.status).toBe(400);
      expect(unknownSkill.body.error?.fields).toEqual({ skillIds: "invalidChoice" });
    });
  });

  // -------------------------------------------------------------------------
  describe("AI generation", () => {
    async function setup(role: "OWNER" | "RECRUITER" = "RECRUITER") {
      const member = await companyWith(role);
      const skills = await makeSkills(2);
      const skillIds = skills.map((s) => s.id);
      return { ...member, skillIds };
    }
    const generate = (token: string, companyId: string, body: unknown, key?: string) =>
      call(generateRoute as Handler, { token, method: "POST", params: { companyId }, body, headers: key ? { "idempotency-key": key } : {} });

    it("returns a job immediately, then produces a validated draft that a human must publish", async () => {
      const { token, company, skillIds } = await setup();
      const body = request(skillIds);
      const provider = new MockAiProvider([jsonResponse(buildValidGeneratedAssessment(body))]);
      holder.provider = provider;

      const started = await generate(token, company.id, body);
      expect(started.status).toBe(202);
      const jobId = aiJobSchema.parse(started.body.data.job).id;
      expect(started.body.data.job.status).toBe("QUEUED");

      await settle();
      const done = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId } })).body.data);
      expect(done).toMatchObject({ status: "SUCCEEDED", inputTokens: 1200, outputTokens: 800, errorCode: null });
      expect(done.assessmentId).toBeTruthy();

      const detail = assessmentDetailSchema.parse((await call(getAssessmentRoute as Handler, { token, params: A(done.assessmentId!) })).body.data);
      expect(detail).toMatchObject({ creationSource: "AI_GENERATED", aiJobId: jobId, hasPublishedVersion: false, version: { status: "DRAFT" } });
      expect(detail.questions).toHaveLength(4);
      expect(detail.rubric?.criteria.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(100);
      expect(detail.publishIssues).toEqual([]);
      expect(await db().auditLog.count({ where: { targetId: detail.id, action: "assessment.generated" } })).toBe(1);
      expect(await db().auditLog.count({ where: { targetId: detail.id, action: "assessment.published" } })).toBe(0);
      expect(JSON.stringify(started.body)).not.toContain("prompt");
    });

    it("is idempotent: a repeated request returns the same job and calls the provider once", async () => {
      const { token, company, skillIds } = await setup();
      const body = request(skillIds);
      const provider = new MockAiProvider([jsonResponse(buildValidGeneratedAssessment(body))]);
      holder.provider = provider;

      // The local test database (PGlite) serves one query at a time, so background work is awaited between calls.
      const first = await generate(token, company.id, body, "same-key-12345");
      await settle();
      const second = await generate(token, company.id, body, "same-key-12345");
      expect(second.body.data).toMatchObject({ reused: true, job: { id: first.body.data.job.id } });
      const accidental = await generate(token, company.id, body);
      await settle();
      const accidentalAgain = await generate(token, company.id, body);
      expect(accidentalAgain.body.data.job.id).toBe(accidental.body.data.job.id);
      expect(provider.calls).toBe(2);

      const differentInput = await generate(token, company.id, { ...body, questionCount: 5 }, "same-key-12345");
      expect(differentInput.status).toBe(409);
      expect((await generate(token, company.id, body, "x")).status).toBe(400);
    });

    it("scopes idempotency keys to the user", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      const other = await joinCompany(company.id, "RECRUITER");
      holder.provider = new MockAiProvider([jsonResponse(buildValidGeneratedAssessment(request(skillIds)))]);
      const a = await generate(token, company.id, request(skillIds), "shared-key-1");
      await settle();
      const b = await generate(other.token, company.id, request(skillIds), "shared-key-1");
      expect(a.body.data.job.id).not.toBe(b.body.data.job.id);
      await settle();
    });

    it("repairs one invalid answer, then succeeds, and records both calls' tokens", async () => {
      const { token, company, skillIds } = await setup();
      const body = request(skillIds);
      const provider = new MockAiProvider([{ text: "{}", usage: { inputTokens: 10, outputTokens: 5 } }, jsonResponse(buildValidGeneratedAssessment(body))]);
      holder.provider = provider;
      const jobId = (await generate(token, company.id, body)).body.data.job.id as string;
      await settle();
      const job = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId } })).body.data);
      expect(job.status).toBe("SUCCEEDED");
      expect(job.inputTokens).toBe(1210);
      expect(provider.calls).toBe(2);
    });

    it("fails safely on invalid output, never publishes, and exposes no provider or content detail", async () => {
      const { token, company, skillIds } = await setup();
      const leak = "LEAKED-GENERATED-TEXT";
      holder.provider = new MockAiProvider([{ text: JSON.stringify({ title: leak }), usage: { inputTokens: 7, outputTokens: 3 } }]);
      const jobId = (await generate(token, company.id, request(skillIds))).body.data.job.id as string;
      await settle();
      const res = await call(getJobRoute as Handler, { token, params: { jobId } });
      const job = aiJobSchema.parse(res.body.data);
      expect(job).toMatchObject({ status: "FAILED", errorCode: "invalid_output", assessmentId: null, inputTokens: 14 });
      expect(JSON.stringify(res.body)).not.toContain(leak);
      const stored = await db().aIJob.findUniqueOrThrow({ where: { id: jobId } });
      expect(JSON.stringify(stored)).not.toContain(leak);
      expect(await db().assessment.count({ where: { aiJobs: { some: { id: jobId } } } })).toBe(0);
    });

    it("handles provider timeouts and failures with stable codes", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      const cases: [AiProviderError, string, number][] = [
        [new AiProviderError("timeout", true), "provider_timeout", 2],
        [new AiProviderError("unavailable", true), "provider_unavailable", 2],
        [new AiProviderError("rate_limited", false), "provider_rate_limited", 1],
        [new AiProviderError("blocked", false), "provider_blocked", 1],
      ];
      for (const [error, code, calls] of cases) {
        const provider = new MockAiProvider([error]);
        holder.provider = provider;
        const jobId = (await generate(token, company.id, request(skillIds, { additionalInstructions: code }))).body.data.job.id as string;
        await settle();
        const job = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId } })).body.data);
        expect(job).toMatchObject({ status: "FAILED", errorCode: code });
        expect(provider.calls).toBe(calls);
      }
    });

    it("retries a failed job a limited number of times", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      holder.provider = new MockAiProvider([new AiProviderError("misconfigured", false)]);
      const jobId = (await generate(token, company.id, request(skillIds))).body.data.job.id as string;
      await settle();

      holder.provider = new MockAiProvider([jsonResponse(buildValidGeneratedAssessment(request(skillIds)))]);
      const retried = await call(retryJobRoute as Handler, { token, method: "POST", params: { jobId } });
      expect(retried.status).toBe(202);
      await settle();
      const done = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId } })).body.data);
      expect(done).toMatchObject({ status: "SUCCEEDED", retryCount: 1 });
      expect((await call(retryJobRoute as Handler, { token, method: "POST", params: { jobId } })).status).toBe(409);

      // Beyond the cap, a failed job stays failed.
      holder.provider = new MockAiProvider([new AiProviderError("blocked", false)]);
      const failing = (await generate(token, company.id, request(skillIds, { additionalInstructions: "cap" }))).body.data.job.id as string;
      await settle();
      for (let i = 0; i < 2; i++) {
        expect((await call(retryJobRoute as Handler, { token, method: "POST", params: { jobId: failing } })).status).toBe(202);
        await settle();
      }
      expect((await call(retryJobRoute as Handler, { token, method: "POST", params: { jobId: failing } })).status).toBe(409);
    });

    it("cancels a queued job, and discards a result that arrives after cancellation", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => (release = resolve));
      const body = request(skillIds);
      holder.provider = new MockAiProvider([
        () => {
          throw new Error("unused");
        },
      ]);
      // A provider that waits, so cancellation happens while the job is RUNNING.
      holder.provider = {
        name: "mock",
        model: "mock-1",
        generateJson: async () => {
          await gate;
          return jsonResponse(buildValidGeneratedAssessment(body));
        },
      };
      const jobId = (await generate(token, company.id, body)).body.data.job.id as string;
      for (let i = 0; i < 50; i++) {
        if ((await db().aIJob.findUniqueOrThrow({ where: { id: jobId } })).status === "RUNNING") break;
        await new Promise((r) => setTimeout(r, 20));
      }
      const cancelled = await call(cancelJobRoute as Handler, { token, method: "POST", params: { jobId } });
      expect(aiJobSchema.parse(cancelled.body.data).status).toBe("CANCELLED");
      release();
      await settle();
      const job = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId } })).body.data);
      expect(job).toMatchObject({ status: "CANCELLED", assessmentId: null, inputTokens: 1200 });
      expect(await db().assessment.count({ where: { aiJobs: { some: { id: jobId } } } })).toBe(0);
      expect((await call(cancelJobRoute as Handler, { token, method: "POST", params: { jobId } })).status).toBe(409);
    });

    it("fails a job stuck in RUNNING after the timeout window", async () => {
      const { token, company, user } = await setup("OWNER");
      const job = await db().aIJob.create({
        data: { type: "ASSESSMENT_GENERATION", status: "RUNNING", provider: "mock", modelName: "m", companyId: company.id, requestedById: user.id, startedAt: new Date(Date.now() - 3_600_000) },
      });
      const res = aiJobSchema.parse((await call(getJobRoute as Handler, { token, params: { jobId: job.id } })).body.data);
      expect(res).toMatchObject({ status: "FAILED", errorCode: "timeout" });
    });

    it("protects job access: requester and company admins only", async () => {
      const owner = await setup("OWNER");
      holder.provider = new MockAiProvider([jsonResponse(buildValidGeneratedAssessment(request(owner.skillIds)))]);
      const recruiter = await joinCompany(owner.company.id, "RECRUITER");
      const other = await joinCompany(owner.company.id, "RECRUITER");
      const outsider = await companyWith("OWNER");
      const jobId = (await generate(recruiter.token, owner.company.id, request(owner.skillIds))).body.data.job.id as string;
      await settle();

      expect((await call(getJobRoute as Handler, { token: recruiter.token, params: { jobId } })).status).toBe(200);
      expect((await call(getJobRoute as Handler, { token: owner.token, params: { jobId } })).status).toBe(200);
      for (const stranger of [other, outsider]) {
        expect((await call(getJobRoute as Handler, { token: stranger.token, params: { jobId } })).status).toBe(403);
        expect((await call(cancelJobRoute as Handler, { token: stranger.token, method: "POST", params: { jobId } })).status).toBe(403);
        expect((await call(retryJobRoute as Handler, { token: stranger.token, method: "POST", params: { jobId } })).status).toBe(403);
      }
      expect((await call(getJobRoute as Handler, { token: owner.token, params: { jobId: "not-a-uuid" } })).status).toBe(403);
    });

    it("enforces per-user, per-company and concurrency limits, and counts failed jobs", async () => {
      const member = await setup("OWNER");
      holder.provider = new MockAiProvider([new AiProviderError("blocked", false)]);
      process.env.GENERATION_PER_USER_PER_DAY = "2";
      try {
        await generate(member.token, member.company.id, request(member.skillIds, { additionalInstructions: "1" }));
        await settle();
        await generate(member.token, member.company.id, request(member.skillIds, { additionalInstructions: "2" }));
        await settle();
        const limited = await generate(member.token, member.company.id, request(member.skillIds, { additionalInstructions: "3" }));
        expect(limited.status).toBe(429);
        expect(limited.body.error?.code).toBe("RATE_LIMITED");
      } finally {
        delete process.env.GENERATION_PER_USER_PER_DAY;
      }

      const busy = await setup("OWNER");
      process.env.GENERATION_MAX_CONCURRENT_PER_COMPANY = "1";
      process.env.GENERATION_PER_COMPANY_PER_DAY = "100";
      try {
        await db().aIJob.create({ data: { type: "ASSESSMENT_GENERATION", status: "RUNNING", provider: "mock", modelName: "m", companyId: busy.company.id, requestedById: busy.user.id, startedAt: new Date() } });
        expect((await generate(busy.token, busy.company.id, request(busy.skillIds))).status).toBe(429);
      } finally {
        delete process.env.GENERATION_MAX_CONCURRENT_PER_COMPANY;
        delete process.env.GENERATION_PER_COMPANY_PER_DAY;
      }

      const company = await setup("OWNER");
      process.env.GENERATION_PER_COMPANY_PER_DAY = "1";
      try {
        await db().aIJob.create({ data: { type: "ASSESSMENT_GENERATION", status: "FAILED", provider: "mock", modelName: "m", companyId: company.company.id, requestedById: (await signedInUser()).user.id } });
        expect((await generate(company.token, company.company.id, request(company.skillIds))).status).toBe(429);
      } finally {
        delete process.env.GENERATION_PER_COMPANY_PER_DAY;
      }
    });

    it("bounds input: question count, skills, instruction length, language", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      holder.provider = new MockAiProvider([jsonResponse({})]);
      const bad = [
        { ...request(skillIds), questionCount: 31 },
        { ...request(skillIds), questionCount: 0 },
        { ...request(skillIds), additionalInstructions: "x".repeat(1001) },
        { ...request(skillIds), language: "fr" },
        { ...request(skillIds), skills: [] },
        { ...request(skillIds), durationMinutes: 1 },
      ];
      for (const body of bad) expect((await generate(token, company.id, body)).status).toBe(400);
      expect(holder.tasks).toHaveLength(0);
      const unknown = await generate(token, company.id, request([randomUUID()]));
      expect(unknown.status).toBe(400);
    });

    it("is unavailable, creating no job, when no provider is configured", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      holder.provider = null;
      const before = await db().aIJob.count({ where: { companyId: company.id } });
      expect((await generate(token, company.id, request(skillIds))).status).toBe(503);
      expect(await db().aIJob.count({ where: { companyId: company.id } })).toBe(before);
    });

    it("regenerates one question in the open draft through a job", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      const body = request(skillIds);
      const generated = buildValidGeneratedAssessment(body);
      holder.provider = new MockAiProvider([jsonResponse(generated)]);
      const first = await generate(token, company.id, body);
      await settle();
      const assessmentId = first.body.data.job && (await call(getJobRoute as Handler, { token, params: { jobId: first.body.data.job.id } })).body.data.assessmentId;
      const draft = assessmentDetailSchema.parse((await call(getAssessmentRoute as Handler, { token, params: A(assessmentId) })).body.data);
      const target = draft.questions[0]!;
      expect(target.kind).toBe("multiple_choice");

      const replacement = { ...generated.questions[0]!, prompt: "A brand new prompt?" };
      holder.provider = new MockAiProvider([jsonResponse({ question: replacement })]);
      const started = await call(regenerateRoute as Handler, { token, method: "POST", params: { ...A(assessmentId), questionId: target.id }, body: {} });
      expect(started.status).toBe(202);
      await settle();
      const after = assessmentDetailSchema.parse((await call(getAssessmentRoute as Handler, { token, params: A(assessmentId) })).body.data);
      expect(after.questions[0]).toMatchObject({ id: target.id, prompt: "A brand new prompt?" });

      // A published version cannot be regenerated; the request is refused before any job exists.
      expect((await call(publishRoute as Handler, { token, method: "POST", params: A(assessmentId) })).status).toBe(200);
      const refused = await call(regenerateRoute as Handler, { token, method: "POST", params: { ...A(assessmentId), questionId: target.id }, body: {} });
      expect(refused.status).toBe(400);
    });

    it("never lets generated content or logs reveal the provider key", async () => {
      const { token, company, skillIds } = await setup("OWNER");
      process.env.GEMINI_API_KEY = "AIza-test-secret-key";
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      holder.provider = new MockAiProvider([new AiProviderError("unavailable", true)]);
      const jobId = (await generate(token, company.id, request(skillIds))).body.data.job.id as string;
      await settle();
      const res = await call(getJobRoute as Handler, { token, params: { jobId } });
      expect(JSON.stringify(res.body) + JSON.stringify(spy.mock.calls)).not.toContain("AIza-test-secret-key");
      delete process.env.GEMINI_API_KEY;
      spy.mockRestore();
    });
  });
});
