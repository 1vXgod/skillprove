import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { createPrismaClient, type PrismaClient } from "@skillprove/database";
import { encodeQuestion } from "@skillprove/assessment-engine";
import { attemptResultSchema, candidateAttemptSchema, questionContentSchema, takeableAssessmentListSchema } from "@skillprove/validation";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetClerkForTests } from "../../../lib/auth/clerk";
import { POST as startAttemptRoute } from "./me/assessments/[assessmentId]/attempts/route";
import { GET as listAssessments } from "./me/assessments/route";
import { GET as getAttempt } from "./me/attempts/[attemptId]/route";
import { GET as resultRoute } from "./me/attempts/[attemptId]/result/route";
import { POST as submitRoute } from "./me/attempts/[attemptId]/submit/route";

/**
 * The real route handlers, guards, Clerk token verification and repositories, against a
 * local database. Tokens are signed with a throwaway key, so Clerk is never contacted.
 * Only localhost databases are accepted here.
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

const holder = vi.hoisted(() => ({ db: null as PrismaClient | null, background: [] as (() => Promise<void>)[] }));
vi.mock("../../../lib/db", () => ({ getDb: () => holder.db }));
// Work scheduled for after the response is collected, not run, so a test can prove the
// request itself never scores, then run the scoring explicitly.
vi.mock("../../../lib/background", () => ({
  runInBackground: (task: () => Promise<void>) => {
    holder.background.push(task);
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

async function call(handler: Handler, options: { token?: string; method?: string; params?: Record<string, string>; body?: unknown } = {}) {
  const request = new Request("http://localhost:4000/api/v1/test", {
    method: options.method ?? "GET",
    headers: { ...(options.token ? { authorization: `Bearer ${options.token}` } : {}), "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) } as never);
  const text = await response.text();
  return { status: response.status, text, body: JSON.parse(text) as { success: boolean; data?: unknown; error?: { code: string } } };
}

const SECRET = "secret-answer-material";
const savedEnv = { ...process.env };

describe.skipIf(!isLocal)("attempt API routes", () => {
  beforeAll(() => {
    process.env.CLERK_SECRET_KEY = "test-only-not-a-real-secret";
    process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("test-instance.clerk.accounts.dev$").toString("base64")}`;
    process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
    resetClerkForTests();
    holder.db = createPrismaClient(url ?? "");
  });
  afterAll(async () => {
    await holder.db?.$disconnect();
    process.env = savedEnv;
    resetClerkForTests();
  });

  const db = () => {
    if (!holder.db) throw new Error("No test database.");
    return holder.db;
  };

  /** A user already synced from Clerk, optionally with a candidate profile. */
  async function signedIn(options: { profile?: boolean } = { profile: true }) {
    const subject = `user_${randomUUID().replaceAll("-", "")}`;
    const user = await db().user.create({ data: { authSubject: subject, email: `${randomUUID()}@test.invalid` } });
    if (options.profile) await db().candidateProfile.create({ data: { userId: user.id, fullName: "Test Candidate", privacySettings: { create: {} } } });
    return { user, token: tokenFor(subject) };
  }

  /** A published, public assessment with one multiple choice and one true/false question. */
  async function takeableAssessment(maxAttempts = 2) {
    const category = await db().skillCategory.create({ data: { slug: `category-${randomUUID()}` } });
    const skill = await db().skill.create({
      data: { slug: `skill-${randomUUID()}`, categoryId: category.id, translations: { create: { locale: "en", name: "Test skill" } } },
    });
    const assessment = await db().assessment.create({ data: { ownerType: "PLATFORM", visibility: "PUBLIC" } });
    const version = await db().assessmentVersion.create({
      data: {
        assessmentId: assessment.id,
        version: 1,
        title: "Route test assessment",
        format: "MULTIPLE_CHOICE",
        difficulty: "BEGINNER",
        maxAttempts,
        durationMinutes: 10,
        // Parsed by the authoring schema and encoded by the authoring codec, so scoring can read it back.
        questions: {
          create: [
            { kind: "multiple_choice", prompt: "Pick B.", choices: [{ id: "A", text: "A" }, { id: "B", text: "B" }], correctChoiceId: "B" },
            { kind: "true_false", prompt: "False?", correct: false },
          ].map((question, i) => {
            const row = encodeQuestion(
              questionContentSchema.parse({ ...question, skillId: skill.id, difficulty: "BEGINNER", estimatedMinutes: 1, explanation: SECRET }),
            );
            return {
              position: i + 1,
              type: "SINGLE_CHOICE" as const,
              prompt: row.prompt,
              options: row.options as object,
              answerKey: row.answerKey as object,
              explanation: row.explanation,
              skillId: row.skillId,
              difficulty: "BEGINNER" as const,
              estimatedMinutes: row.estimatedMinutes,
            };
          }),
        },
        skills: { create: { skillId: skill.id, weight: 100 } },
      },
    });
    const rubric = await db().assessmentRubricVersion.create({
      data: { assessmentVersionId: version.id, version: 1, criteria: { create: { key: "correctness", title: "Correctness", weight: 100 } } },
    });
    await db().assessmentRubricVersion.update({ where: { id: rubric.id }, data: { publishedAt: new Date() } });
    await db().assessmentVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return assessment;
  }

  it("requires a valid session on every route", async () => {
    const params = { assessmentId: randomUUID(), attemptId: randomUUID() };
    expect((await call(listAssessments)).status).toBe(401);
    expect((await call(startAttemptRoute, { method: "POST", params })).status).toBe(401);
    expect((await call(getAttempt, { params })).status).toBe(401);
  });

  it("lists takeable assessments in the documented shape", async () => {
    const { token } = await signedIn();
    const assessment = await takeableAssessment();
    const response = await call(listAssessments, { token });
    expect(response.status).toBe(200);
    const list = takeableAssessmentListSchema.parse(response.body.data);
    expect(list.items.find((a) => a.assessmentId === assessment.id)).toMatchObject({ questionCount: 2, attemptsUsed: 0, openAttemptId: null });
  });

  it("asks for a profile first, then starts once (201) and returns the same attempt on a repeat (200)", async () => {
    const assessment = await takeableAssessment();
    const noProfile = await signedIn({ profile: false });
    const refused = await call(startAttemptRoute, { token: noProfile.token, method: "POST", params: { assessmentId: assessment.id } });
    expect(refused.status).toBe(409);
    expect(refused.body.error?.code).toBe("PROFILE_REQUIRED");

    const { token } = await signedIn();
    const first = await call(startAttemptRoute, { token, method: "POST", params: { assessmentId: assessment.id } });
    const again = await call(startAttemptRoute, { token, method: "POST", params: { assessmentId: assessment.id } });
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    const attempt = candidateAttemptSchema.parse(first.body.data);
    expect(candidateAttemptSchema.parse(again.body.data).id).toBe(attempt.id);
    expect(attempt).toMatchObject({ status: "IN_PROGRESS", attemptNumber: 1, maxAttempts: 2 });
    expect(attempt.questions).toHaveLength(2);
    expect(attempt.expiresAt).not.toBeNull();
  });

  it("never sends answer keys or explanations", async () => {
    const { token } = await signedIn();
    const assessment = await takeableAssessment();
    const started = await call(startAttemptRoute, { token, method: "POST", params: { assessmentId: assessment.id } });
    const attemptId = candidateAttemptSchema.parse(started.body.data).id;
    const read = await call(getAttempt, { token, params: { attemptId } });

    for (const raw of [started.text, read.text]) {
      expect(raw).not.toContain(SECRET);
      expect(raw).not.toMatch(/answerKey|correctChoiceId|"correct"|explanation/);
    }
  });

  it("hides other people's attempts and unknown IDs behind the same 404", async () => {
    const owner = await signedIn();
    const stranger = await signedIn();
    const assessment = await takeableAssessment();
    const started = await call(startAttemptRoute, { token: owner.token, method: "POST", params: { assessmentId: assessment.id } });
    const attemptId = candidateAttemptSchema.parse(started.body.data).id;

    expect((await call(getAttempt, { token: stranger.token, params: { attemptId } })).status).toBe(404);
    expect((await call(getAttempt, { token: owner.token, params: { attemptId: "not-a-uuid" } })).status).toBe(404);
    expect((await call(getAttempt, { token: owner.token, params: { attemptId: randomUUID() } })).status).toBe(404);
    expect((await call(startAttemptRoute, { token: owner.token, method: "POST", params: { assessmentId: randomUUID() } })).status).toBe(404);
    expect((await call(startAttemptRoute, { token: owner.token, method: "POST", params: { assessmentId: "x" } })).status).toBe(404);
  });

  async function startedAttempt() {
    const candidate = await signedIn();
    const assessment = await takeableAssessment();
    const started = await call(startAttemptRoute, { token: candidate.token, method: "POST", params: { assessmentId: assessment.id } });
    const attempt = candidateAttemptSchema.parse(started.body.data);
    return { ...candidate, attempt };
  }

  it("submits once, stores only answers, and drops anything else in the body", async () => {
    const { token, attempt } = await startedAttempt();
    const [mc, tf] = attempt.questions;
    const params = { attemptId: attempt.id };

    const submitted = await call(submitRoute, { token, method: "POST", params, body: { answers: { [mc!.id]: "B", [tf!.id]: false }, score: 100, percent: 100 } });
    expect(submitted.status).toBe(200);
    expect(candidateAttemptSchema.parse(submitted.body.data)).toMatchObject({ status: "SUBMITTED", questions: [] });

    const stored = await db().assessmentSubmission.findFirstOrThrow({ where: { attemptId: attempt.id } });
    expect(stored.responses).toEqual({ [mc!.id]: "B", [tf!.id]: false });
    expect(await db().verifiedSkillScoreCalculation.count({ where: { userId: (await db().assessmentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).candidateUserId } })).toBe(0);

    const again = await call(submitRoute, { token, method: "POST", params, body: { answers: {} } });
    expect(again.status).toBe(409);
    expect(again.body.error?.code).toBe("CONFLICT");
  });

  it("scores after the response is sent, from the stored answers only", async () => {
    const { token, attempt } = await startedAttempt();
    const [mc] = attempt.questions;
    holder.background = [];

    const submitted = await call(submitRoute, { token, method: "POST", params: { attemptId: attempt.id }, body: { answers: { [mc!.id]: "B" }, score: 100 } });
    expect(submitted.status).toBe(200);
    expect(submitted.text).not.toMatch(/score|percent|correct/i);
    expect(await db().evaluation.count({ where: { attemptId: attempt.id } })).toBe(0);

    expect(holder.background).toHaveLength(1);
    await holder.background[0]!();
    const evaluation = await db().evaluation.findFirstOrThrow({ where: { attemptId: attempt.id }, include: { criterionScores: true } });
    // One of two correct, whatever the body claimed. The criterion has no skill, so it gets the overall result.
    expect(Number(evaluation.overallScore)).toBe(50);
    expect(evaluation.criterionScores.map((c) => Number(c.score))).toEqual([50]);
  });

  it("returns the result: pending, then scored, with per-skill percentages only", async () => {
    const { token, attempt } = await startedAttempt();
    const [mc] = attempt.questions;
    const params = { attemptId: attempt.id };

    const early = await call(resultRoute, { token, params });
    expect(early.status).toBe(409);
    expect(early.body.error?.code).toBe("CONFLICT");

    holder.background = [];
    await call(submitRoute, { token, method: "POST", params, body: { answers: { [mc!.id]: "B" } } });
    const pending = await call(resultRoute, { token, params });
    expect(pending.status).toBe(200);
    expect(attemptResultSchema.parse(pending.body.data)).toMatchObject({ state: "pending", percent: null });
    // Only the submit scheduled scoring; a fresh pending result does not start it again.
    expect(holder.background).toHaveLength(1);

    await holder.background[0]!();
    const scored = await call(resultRoute, { token, params });
    expect(attemptResultSchema.parse(scored.body.data)).toMatchObject({
      state: "scored",
      percent: 50,
      questionCount: 2,
      skills: [{ name: "Test skill", questionCount: 2, answeredCount: 1, percent: 50 }],
    });
    expect(scored.text).not.toContain(SECRET);
    expect(scored.text).not.toMatch(/correctChoiceId|answerKey|explanation/);

    const stranger = await signedIn();
    expect((await call(resultRoute, { token: stranger.token, params })).status).toBe(404);
    expect((await call(resultRoute, { params })).status).toBe(401);
  });

  it("starts scoring again when a result is still pending a minute after submit, at most once a minute", async () => {
    const { token, attempt } = await startedAttempt();
    const params = { attemptId: attempt.id };
    await call(submitRoute, { token, method: "POST", params, body: { answers: {} } });
    // The scoring run scheduled by the submit is lost.
    holder.background = [];
    await db().assessmentAttempt.update({ where: { id: attempt.id }, data: { submittedAt: new Date(Date.now() - 120_000) } });

    const pending = await call(resultRoute, { token, params });
    expect(attemptResultSchema.parse(pending.body.data).state).toBe("pending");
    expect(holder.background).toHaveLength(1);
    // A second poll within the minute schedules nothing more.
    expect(attemptResultSchema.parse((await call(resultRoute, { token, params })).body.data).state).toBe("pending");
    expect(holder.background).toHaveLength(1);

    await holder.background[0]!();
    expect(attemptResultSchema.parse((await call(resultRoute, { token, params })).body.data)).toMatchObject({ state: "scored", percent: 0 });
  });

  it("rejects malformed answers before touching the attempt", async () => {
    const { token, attempt } = await startedAttempt();
    const params = { attemptId: attempt.id };
    for (const body of [{}, { answers: { "not-a-uuid": "A" } }, { answers: { [attempt.questions[0]!.id]: 7 } }]) {
      const response = await call(submitRoute, { token, method: "POST", params, body });
      expect(response.status).toBe(400);
    }
    expect((await db().assessmentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).status).toBe("IN_PROGRESS");
  });

  it("answers ATTEMPT_EXPIRED after the grace period, and hides other people's attempts", async () => {
    const { token, attempt } = await startedAttempt();
    const stranger = await signedIn();
    const params = { attemptId: attempt.id };

    expect((await call(submitRoute, { token: stranger.token, method: "POST", params, body: { answers: {} } })).status).toBe(404);
    expect((await call(submitRoute, { method: "POST", params, body: { answers: {} } })).status).toBe(401);

    // Started an hour ago: the database requires expires_at to be after started_at.
    await db().assessmentAttempt.update({
      where: { id: attempt.id },
      data: { startedAt: new Date(Date.now() - 3_600_000), expiresAt: new Date(Date.now() - 1000) },
    });
    const late = await call(submitRoute, { token, method: "POST", params, body: { answers: {} } });
    expect(late.status).toBe(409);
    expect(late.body.error?.code).toBe("ATTEMPT_EXPIRED");
  });

  it("refuses a new attempt when every attempt is used", async () => {
    const { token } = await signedIn();
    const assessment = await takeableAssessment(1);
    const started = await call(startAttemptRoute, { token, method: "POST", params: { assessmentId: assessment.id } });
    await db().assessmentAttempt.update({ where: { id: candidateAttemptSchema.parse(started.body.data).id }, data: { status: "ABANDONED" } });

    const refused = await call(startAttemptRoute, { token, method: "POST", params: { assessmentId: assessment.id } });
    expect(refused.status).toBe(409);
    expect(refused.body.error?.code).toBe("ATTEMPTS_EXHAUSTED");
  });
});
