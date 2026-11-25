import { encodeQuestion } from "@skillprove/assessment-engine";
import { questionContentSchema, type QuestionContent } from "@skillprove/validation";
import { afterAll, beforeAll } from "vitest";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { QuestionRow } from "../repositories/assessments";
import { createPrismaClient } from "../index";
import {
  assertExpectedBranch,
  checkTestDatabaseUrl,
  loadProtectedUrls,
} from "../test-database-guard";

const url = process.env.TEST_DATABASE_URL;

// Runs on import, before any client exists, so a refused database is never contacted.
const guard = url
  ? checkTestDatabaseUrl({
      url,
      protectedUrls: loadProtectedUrls(),
      allowedBranchId: process.env.TEST_NEON_BRANCH_ID,
    })
  : null;

/** Database tests are skipped on a fresh checkout. CI always sets the URL. */
export const hasNoTestDatabase = !url;

/** Call inside a `describe`. Tests add rows with random keys and never clean up by deleting. */
export function useTestDatabase(): PrismaClient {
  const client = createPrismaClient(url ?? "");

  beforeAll(async () => {
    if (!guard?.requiredBranchId) return;
    const [row] = await client.$queryRaw<{ branch: string | null }[]>`
      SELECT current_setting('neon.branch_id', true) AS branch`;
    assertExpectedBranch(row?.branch ?? null, guard.requiredBranchId);
  });
  afterAll(() => client.$disconnect());

  return client;
}

const unique = () => crypto.randomUUID();

export function createUser(db: PrismaClient) {
  return db.user.create({ data: { email: `${unique()}@test.invalid` } });
}

export function createCompany(db: PrismaClient) {
  return db.company.create({ data: { name: "Test company", slug: `test-${unique()}` } });
}

export async function createSkill(db: PrismaClient) {
  const category = await db.skillCategory.create({ data: { slug: `test-${unique()}` } });
  return db.skill.create({ data: { slug: `test-${unique()}`, categoryId: category.id } });
}

/** A published assessment version with one skill and a published two-criterion rubric. */
export async function createPublishedAssessment(
  db: PrismaClient,
  options: { companyId?: string; skillId: string; maxAttempts?: number },
) {
  const assessment = await db.assessment.create({
    data: {
      ownerType: options.companyId ? "COMPANY" : "PLATFORM",
      ownerCompanyId: options.companyId,
    },
  });
  const version = await db.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: 1,
      title: "Test assessment",
      format: "WRITTEN",
      difficulty: "INTERMEDIATE",
      maxAttempts: options.maxAttempts ?? 2,
      questions: { create: { position: 1, type: "LONG_TEXT", prompt: "Explain." } },
      skills: { create: { skillId: options.skillId, weight: 100 } },
    },
  });
  const rubric = await db.assessmentRubricVersion.create({
    data: {
      assessmentVersionId: version.id,
      version: 1,
      criteria: {
        create: [
          { key: "accuracy", title: "Accuracy", weight: 60 },
          { key: "clarity", title: "Clarity", weight: 40 },
        ],
      },
    },
    include: { criteria: { orderBy: { key: "asc" } } },
  });
  await db.assessmentRubricVersion.update({
    where: { id: rubric.id },
    data: { publishedAt: new Date() },
  });
  await db.assessmentVersion.update({
    where: { id: version.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  return { assessment, version, rubric, criteria: rubric.criteria };
}

export async function createSubmittedAttempt(
  db: PrismaClient,
  published: Awaited<ReturnType<typeof createPublishedAssessment>>,
  candidateUserId: string,
  attemptNumber = 1,
) {
  const attempt = await db.assessmentAttempt.create({
    data: {
      assessmentVersionId: published.version.id,
      rubricVersionId: published.rubric.id,
      candidateUserId,
      attemptNumber,
    },
  });
  const submission = await db.assessmentSubmission.create({
    data: { attemptId: attempt.id, responses: { answer: "My work." } },
  });
  await db.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  return { attempt, submission };
}

export function createPendingEvaluation(
  db: PrismaClient,
  submitted: Awaited<ReturnType<typeof createSubmittedAttempt>>,
  rubricVersionId: string,
) {
  return db.evaluation.create({
    data: {
      attemptId: submitted.attempt.id,
      submissionId: submitted.submission.id,
      rubricVersionId,
      evaluatorType: "AI",
      provider: "test-provider",
      modelName: "test-model",
    },
  });
}

/** Everything from a new assessment through to a completed evaluation with evidence. */
export async function createCompletedEvaluation(
  db: PrismaClient,
  options: { companyId?: string; skillId: string; candidateUserId: string; score?: number },
) {
  const published = await createPublishedAssessment(db, options);
  const submitted = await createSubmittedAttempt(db, published, options.candidateUserId);
  const pending = await createPendingEvaluation(db, submitted, published.rubric.id);
  const [criterion] = published.criteria;
  if (!criterion) throw new Error("The rubric has no criteria.");

  const criterionScore = await db.evaluationCriterionScore.create({
    data: {
      evaluationId: pending.id,
      rubricVersionId: published.rubric.id,
      criterionId: criterion.id,
      score: options.score ?? 80,
    },
  });
  await db.evaluationEvidence.create({
    data: { evaluationId: pending.id, criterionScoreId: criterionScore.id, excerpt: "My work." },
  });
  const evaluation = await db.evaluation.update({
    where: { id: pending.id },
    data: { status: "COMPLETED", overallScore: options.score ?? 80, completedAt: new Date() },
  });
  return { published, submitted, evaluation, criterionScore };
}

/**
 * Marker text in every explanation and in the written question's evaluation criteria, so tests
 * can prove none of the private material leaks. Answer keys themselves hold only choice IDs and
 * booleans, which the authoring schema requires.
 */
export const SECRET = "secret-answer-material";

/**
 * The question content behind `createObjectiveAssessment`, parsed by the same schema the
 * authoring API uses, so the fixture cannot drift into data that scoring would refuse.
 * Correct answers: multiple choice "B", true/false false, multiple select "A" and "C".
 */
export function fixtureQuestionContents(skillId: string, options: { withWrittenQuestion?: boolean } = {}): QuestionContent[] {
  const choices = [
    { id: "A", text: "One" },
    { id: "B", text: "Two" },
    { id: "C", text: "Three" },
  ];
  const common = { skillId, difficulty: "INTERMEDIATE", estimatedMinutes: 1, explanation: SECRET };
  const contents: unknown[] = [
    { ...common, kind: "multiple_choice", prompt: "Pick two.", choices, correctChoiceId: "B" },
    { ...common, kind: "true_false", prompt: "The sky is green.", correct: false },
    { ...common, kind: "multiple_select", prompt: "Pick one and three.", choices, correctChoiceIds: ["A", "C"] },
    ...(options.withWrittenQuestion
      ? [
          {
            skillId,
            difficulty: "INTERMEDIATE",
            estimatedMinutes: 10,
            kind: "practical_task",
            description: "Explain.",
            requirements: ["Write a paragraph."],
            deliverables: ["A paragraph."],
            evaluationCriteria: [SECRET],
          },
        ]
      : []),
  ];
  return contents.map((c) => questionContentSchema.parse(c));
}

/**
 * A takeable assessment for Milestone 7: one multiple choice (correct "B"), one true/false
 * (correct false) and one multiple select (correct "A" and "C"), all for one skill. Options
 * change it into something that must not be takeable.
 */
export async function createObjectiveAssessment(
  db: PrismaClient,
  options: {
    skillId: string;
    visibility?: "PUBLIC" | "INVITE_ONLY";
    publish?: boolean;
    withWrittenQuestion?: boolean;
    maxAttempts?: number;
    durationMinutes?: number | null;
    attemptTtlHours?: number | null;
    difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  },
) {
  const assessment = await db.assessment.create({
    data: { ownerType: "PLATFORM", visibility: options.visibility ?? "PUBLIC" },
  });
  // Encoded exactly as the authoring API stores questions.
  const questions = fixtureQuestionContents(options.skillId, { withWrittenQuestion: options.withWrittenQuestion }).map((content, i) => {
    const row = encodeQuestion(content) as QuestionRow;
    return { ...row, position: i + 1, options: row.options as Prisma.InputJsonValue, answerKey: row.answerKey as Prisma.InputJsonValue };
  });
  const version = await db.assessmentVersion.create({
    data: {
      assessmentId: assessment.id,
      version: 1,
      title: "Objective assessment",
      format: "MULTIPLE_CHOICE",
      difficulty: options.difficulty ?? "INTERMEDIATE",
      maxAttempts: options.maxAttempts ?? 2,
      durationMinutes: options.durationMinutes === undefined ? 20 : options.durationMinutes,
      attemptTtlHours: options.attemptTtlHours ?? null,
      questions: { create: questions },
      skills: { create: { skillId: options.skillId, weight: 100 } },
    },
  });
  const rubric = await db.assessmentRubricVersion.create({
    data: {
      assessmentVersionId: version.id,
      version: 1,
      criteria: { create: { key: "correctness", title: "Correctness", weight: 100, skillId: options.skillId } },
    },
  });
  if (options.publish !== false) {
    await db.assessmentRubricVersion.update({ where: { id: rubric.id }, data: { publishedAt: new Date() } });
    await db.assessmentVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  }
  return { assessment, version, rubric };
}

/** A user with a candidate profile, which taking an assessment requires. */
export async function createCandidate(db: PrismaClient) {
  const user = await createUser(db);
  await db.candidateProfile.create({ data: { userId: user.id, fullName: "Test Candidate", privacySettings: { create: {} } } });
  return user;
}
