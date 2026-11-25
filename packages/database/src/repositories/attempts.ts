import { SCORING_RETRY_AFTER_SECONDS, SUBMISSION_GRACE_SECONDS } from "@skillprove/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { AttemptDataError } from "./attempt-errors";
import { isUniqueViolation } from "./candidate-errors";
import { skillName, skillWithNames, type SkillLocale } from "./skills";

/*
 * Candidates taking assessments (Milestone 7). Every query here selects question options and
 * prompts only: answer keys and explanations are never read, so they cannot leak into a
 * candidate response by mistake.
 */

/** Question types that hold only objective kinds (multiple choice, true/false, multiple select). */
const OBJECTIVE_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] as const;

/** Used when an assessment sets neither a duration nor an attempt lifetime. */
export const DEFAULT_ATTEMPT_HOURS = 24;

/**
 * What a candidate may take in Milestone 7: a published version of a public, undeleted
 * assessment with a published rubric, whose questions are all objective.
 */
const takeableVersion = {
  status: "PUBLISHED",
  assessment: { visibility: "PUBLIC", deletedAt: null },
  rubrics: { some: { publishedAt: { not: null } } },
  questions: { some: {}, every: { type: { in: [...OBJECTIVE_TYPES] } } },
} satisfies Prisma.AssessmentVersionWhereInput;

/** The deadline a candidate sees: the assessment's duration, else its attempt lifetime, else 24 hours. */
export function attemptDeadline(
  startedAt: Date,
  version: { durationMinutes: number | null; attemptTtlHours: number | null },
): Date {
  const minutes = version.durationMinutes ?? (version.attemptTtlHours ?? DEFAULT_ATTEMPT_HOURS) * 60;
  return new Date(startedAt.getTime() + minutes * 60_000);
}

/*
 * `expires_at` stores the hard cutoff: the deadline plus the grace period. The database's
 * submission trigger refuses anything after it, so the grace period is enforced there too.
 * Candidates are shown the deadline itself, `expires_at` minus the grace period.
 */
const GRACE_MS = SUBMISSION_GRACE_SECONDS * 1000;
const toCutoff = (deadline: Date) => new Date(deadline.getTime() + GRACE_MS);
const toDeadline = (cutoff: Date | null) => (cutoff ? new Date(cutoff.getTime() - GRACE_MS) : null);

/** Marks the candidate's attempts past their cutoff as expired. Done on read, since there is no background job. */
async function expireOverdueAttempts(db: PrismaClient | Prisma.TransactionClient, userId: string, attemptId?: string) {
  await db.assessmentAttempt.updateMany({
    where: { candidateUserId: userId, status: "IN_PROGRESS", expiresAt: { lte: new Date() }, ...(attemptId ? { id: attemptId } : {}) },
    data: { status: "EXPIRED" },
  });
}

/** Published, public, fully objective assessments, with this candidate's attempt counts. */
export async function listTakeableAssessments(db: PrismaClient, userId: string, locale: SkillLocale) {
  await expireOverdueAttempts(db, userId);
  const versions = await db.assessmentVersion.findMany({
    where: takeableVersion,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    include: {
      skills: { orderBy: { weight: "desc" }, include: { skill: { include: skillWithNames(locale) } } },
      attempts: { where: { candidateUserId: userId }, select: { id: true, status: true } },
      _count: { select: { questions: true } },
    },
  });

  return versions.map((v) => ({
    assessmentId: v.assessmentId,
    versionId: v.id,
    title: v.title,
    description: v.description,
    language: v.language,
    difficulty: v.difficulty,
    durationMinutes: v.durationMinutes,
    questionCount: v._count.questions,
    skills: v.skills.map((s) => ({ skillId: s.skillId, name: skillName(s.skill, locale) })),
    maxAttempts: v.maxAttempts,
    attemptsUsed: v.attempts.length,
    openAttemptId: v.attempts.find((a) => a.status === "IN_PROGRESS")?.id ?? null,
  }));
}

/**
 * Starts an attempt, or returns the one already in progress so a double tap or a retry never
 * uses up a second attempt. Requires a candidate profile. Every attempt, including expired and
 * abandoned ones, counts toward `maxAttempts`, so nobody can look at the questions and retake.
 */
export async function startAttempt(db: PrismaClient, userId: string, assessmentId: string): Promise<{ attemptId: string; created: boolean }> {
  await expireOverdueAttempts(db, userId);
  const version = await db.assessmentVersion.findFirst({
    where: { ...takeableVersion, assessmentId },
    include: {
      rubrics: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1, select: { id: true } },
      attempts: { where: { candidateUserId: userId }, orderBy: { attemptNumber: "desc" }, select: { id: true, status: true, attemptNumber: true } },
    },
  });
  const rubric = version?.rubrics[0];
  if (!version || !rubric) throw new AttemptDataError("not_found");

  // Verified scores belong on a candidate's profile, so one must exist before an attempt starts.
  const profile = await db.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new AttemptDataError("profile_required");

  const open = version.attempts.find((a) => a.status === "IN_PROGRESS");
  if (open) return { attemptId: open.id, created: false };
  if (version.attempts.length >= version.maxAttempts) throw new AttemptDataError("attempts_exhausted");

  const startedAt = new Date();
  try {
    const attempt = await db.assessmentAttempt.create({
      data: {
        assessmentVersionId: version.id,
        rubricVersionId: rubric.id,
        candidateUserId: userId,
        attemptNumber: (version.attempts[0]?.attemptNumber ?? 0) + 1,
        startedAt,
        expiresAt: toCutoff(attemptDeadline(startedAt, version)),
      },
      select: { id: true },
    });
    return { attemptId: attempt.id, created: true };
  } catch (error) {
    // Two requests raced for the same attempt number: return whichever attempt won.
    if (!isUniqueViolation(error)) throw error;
    const winner = await db.assessmentAttempt.findFirst({
      where: { assessmentVersionId: version.id, candidateUserId: userId, status: "IN_PROGRESS" },
      select: { id: true },
    });
    if (!winner) throw error;
    return { attemptId: winner.id, created: false };
  }
}

type OptionsJson = { kind?: unknown; choices?: unknown };

/** Builds the candidate's view of a question from its options and prompt alone. */
function toAttemptQuestion(row: { id: string; position: number; prompt: string; options: Prisma.JsonValue }) {
  const options = (typeof row.options === "object" && row.options !== null && !Array.isArray(row.options) ? row.options : {}) as OptionsJson;
  const choices = Array.isArray(options.choices)
    ? options.choices.map((c: { id?: unknown; text?: unknown }) => ({ id: String(c.id), text: String(c.text) }))
    : [];
  switch (options.kind) {
    case "multiple_choice":
    case "multiple_select":
      return { id: row.id, position: row.position, kind: options.kind, prompt: row.prompt, choices };
    case "true_false":
      return { id: row.id, position: row.position, kind: options.kind, prompt: row.prompt };
    default:
      // Takeable versions hold only objective questions, so this means corrupted data.
      throw new Error(`Question ${row.id} is not an objective question.`);
  }
}

/** The candidate's own attempt, or null if it does not exist or belongs to someone else. */
export async function getCandidateAttempt(db: PrismaClient, userId: string, attemptId: string) {
  await expireOverdueAttempts(db, userId, attemptId);
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, candidateUserId: userId },
    include: {
      assessmentVersion: {
        select: {
          assessmentId: true,
          title: true,
          instructions: true,
          language: true,
          difficulty: true,
          maxAttempts: true,
          questions: { orderBy: { position: "asc" }, select: { id: true, position: true, prompt: true, options: true } },
        },
      },
    },
  });
  if (!attempt) return null;

  const v = attempt.assessmentVersion;
  return {
    id: attempt.id,
    assessmentId: v.assessmentId,
    title: v.title,
    instructions: v.instructions,
    language: v.language,
    difficulty: v.difficulty,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    maxAttempts: v.maxAttempts,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: toDeadline(attempt.expiresAt)?.toISOString() ?? null,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    // Questions are only needed, and only shown, while the attempt can still be answered.
    questions: attempt.status === "IN_PROGRESS" ? v.questions.map(toAttemptQuestion) : [],
  };
}

/** The database's submission trigger reports these as plain errors; turn them into reasons. */
function fromSubmissionTrigger(error: unknown): AttemptDataError | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("attempt has expired")) return new AttemptDataError("expired");
  if (message.includes("attempt is not in progress")) return new AttemptDataError("not_in_progress");
  return null;
}

/**
 * Stores the candidate's answers and closes the attempt, once. Only answers to this attempt's
 * own questions are kept; anything else in the request is dropped. Accepted until the hard
 * cutoff (deadline plus grace period). Nothing here scores: scoring reads the stored
 * submission later, so nothing a client sends can reach a score.
 */
export async function submitAttempt(
  db: PrismaClient,
  userId: string,
  attemptId: string,
  answers: Record<string, unknown>,
): Promise<{ submissionId: string; submittedAt: string }> {
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, candidateUserId: userId },
    select: { status: true, expiresAt: true, assessmentVersion: { select: { questions: { select: { id: true } } } } },
  });
  if (!attempt) throw new AttemptDataError("not_found");
  if (attempt.status === "IN_PROGRESS" && attempt.expiresAt && attempt.expiresAt <= new Date()) {
    await expireOverdueAttempts(db, userId, attemptId);
    throw new AttemptDataError("expired");
  }
  if (attempt.status === "EXPIRED") throw new AttemptDataError("expired");
  if (attempt.status !== "IN_PROGRESS") throw new AttemptDataError("not_in_progress");

  const questionIds = new Set(attempt.assessmentVersion.questions.map((q) => q.id));
  const responses = Object.fromEntries(Object.entries(answers).filter(([id]) => questionIds.has(id))) as Prisma.InputJsonObject;

  try {
    return await db.$transaction(async (tx) => {
      const submission = await tx.assessmentSubmission.create({
        data: { attemptId, responses },
        select: { id: true, submittedAt: true },
      });
      const closed = await tx.assessmentAttempt.updateMany({
        where: { id: attemptId, status: "IN_PROGRESS" },
        data: { status: "SUBMITTED", submittedAt: submission.submittedAt },
      });
      if (closed.count !== 1) throw new AttemptDataError("not_in_progress");
      return { submissionId: submission.id, submittedAt: submission.submittedAt.toISOString() };
    });
  } catch (error) {
    // A second submit racing the first hits the unique (attempt, revision) key.
    if (isUniqueViolation(error)) throw new AttemptDataError("not_in_progress");
    throw fromSubmissionTrigger(error) ?? error;
  }
}

/**
 * The candidate's result for a submitted attempt: overall and per-skill percentages only, never
 * which questions were right. `pending` while scoring runs, `failed` if it cannot be scored
 * automatically. `retryScoring` is true when a pending result is old enough that the scoring
 * run was probably lost; the caller then starts it again. Throws `not_found` for someone else's
 * attempt, `expired` and `not_submitted` for attempts that have no result.
 */
export async function getAttemptResult(db: PrismaClient, userId: string, attemptId: string, locale: SkillLocale) {
  await expireOverdueAttempts(db, userId, attemptId);
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, candidateUserId: userId },
    select: {
      status: true,
      submittedAt: true,
      assessmentVersion: { select: { _count: { select: { questions: true } } } },
      evaluations: {
        where: { evaluatorType: "AUTOMATIC", supersedesEvaluationId: null, status: { in: ["COMPLETED", "FAILED"] } },
        select: {
          status: true,
          overallScore: true,
          completedAt: true,
          skillResults: { select: { questionCount: true, answeredCount: true, percent: true, skill: { include: skillWithNames(locale) } } },
        },
      },
    },
  });
  if (!attempt) throw new AttemptDataError("not_found");
  if (attempt.status === "EXPIRED") throw new AttemptDataError("expired");
  if (attempt.status !== "SUBMITTED" || !attempt.submittedAt) throw new AttemptDataError("not_submitted");

  // A successful evaluation wins over a failed one, which only remains after a re-score.
  const evaluation = attempt.evaluations.find((e) => e.status === "COMPLETED") ?? attempt.evaluations[0] ?? null;
  const state = evaluation ? (evaluation.status === "COMPLETED" ? "scored" : "failed") : "pending";
  const scored = state === "scored" ? evaluation : null;

  return {
    result: {
      attemptId,
      state,
      submittedAt: attempt.submittedAt.toISOString(),
      scoredAt: scored?.completedAt?.toISOString() ?? null,
      questionCount: attempt.assessmentVersion._count.questions,
      // A completed evaluation always has an overall score; the database requires one.
      percent: scored ? Number(scored.overallScore) : null,
      skills: (scored?.skillResults ?? [])
        .map((r) => ({
          skillId: r.skill.id,
          name: skillName(r.skill, locale),
          questionCount: r.questionCount,
          answeredCount: r.answeredCount,
          percent: Number(r.percent),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
    retryScoring: state === "pending" && Date.now() - attempt.submittedAt.getTime() >= SCORING_RETRY_AFTER_SECONDS * 1000,
  };
}
