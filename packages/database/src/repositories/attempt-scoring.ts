import {
  AUTO_FORMULA_VERSION,
  calculateVerifiedSkillScore,
  decodeQuestion,
  scoreObjectiveAttempt,
  NotObjectiveError,
  type ObjectiveScore,
  type SkillEvaluationInput,
} from "@skillprove/assessment-engine";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { isUniqueViolation } from "./candidate-errors";
import { recordVerifiedSkillScoreInTransaction } from "./verified-skill-scores";

/*
 * Automatic scoring of a submitted attempt (Milestone 7). Runs on the server after submit,
 * from the stored submission and the private answer keys only: nothing a client sends can
 * reach a score. The evaluation, its criterion and skill results, and the candidate's
 * recalculated verified scores commit together or not at all.
 */

/** Long enough for a full recalculation; the default 5 seconds is tight on a cold database. */
const TRANSACTION_TIMEOUT_MS = 15_000;

export type ScoreAttemptResult = { evaluationId: string; created: boolean; status: "COMPLETED" | "FAILED" };

/**
 * The original automatic evaluations of an attempt. The database allows at most one that has
 * not failed; a FAILED one may sit beside it once the attempt is re-scored after a fix.
 */
const automaticEvaluationOf = (attemptId: string) =>
  ({ attemptId, evaluatorType: "AUTOMATIC", supersedesEvaluationId: null, status: { not: "PENDING" } }) satisfies Prisma.EvaluationWhereInput;

/** The one that counts: a successful evaluation if there is one, otherwise the failure. */
const currentAutomaticEvaluation = (db: PrismaClient | Prisma.TransactionClient, attemptId: string) =>
  db.evaluation
    .findMany({ where: automaticEvaluationOf(attemptId), select: { id: true, status: true } })
    .then((rows) => rows.find((r) => r.status === "COMPLETED") ?? rows[0] ?? null);

/**
 * A problem with the assessment's stored data that will happen again on every run, such as
 * a question that no longer passes validation. Recorded as a FAILED evaluation, so scoring
 * stops retrying; anything else is treated as temporary and may be retried.
 */
class UnscorableAttemptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnscorableAttemptError";
  }
}

const isPermanent = (error: unknown) => error instanceof UnscorableAttemptError || error instanceof NotObjectiveError;

const asResult = (row: { id: string; status: string }, created: boolean): ScoreAttemptResult => ({
  evaluationId: row.id,
  created,
  status: row.status === "FAILED" ? "FAILED" : "COMPLETED",
});

/**
 * Scores a submitted attempt, once. Safe to call again and from several places at the same
 * time: a repeat returns the existing evaluation, including a FAILED one, so a permanent
 * failure is not retried. Returns null when there is nothing to score yet (the attempt is not
 * submitted, or its answers were erased). Temporary errors are thrown, record nothing, and can
 * be retried. This is the evaluation pipeline: never call it with input from a request body.
 */
export async function scoreAttempt(db: PrismaClient, attemptId: string): Promise<ScoreAttemptResult | null> {
  const owner = await db.assessmentAttempt.findUnique({ where: { id: attemptId }, select: { candidateUserId: true } });
  if (!owner) return null;

  try {
    return await db.$transaction(
      async (tx) => {
        // One scoring run per candidate at a time, so two attempts finishing together cannot
        // each recalculate a verified score without the other's result.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('score-attempt:' || ${owner.candidateUserId}::text))`;

        const existing = await currentAutomaticEvaluation(tx, attemptId);
        if (existing) return asResult(existing, false);

        return await scoreInTransaction(tx, attemptId, owner.candidateUserId);
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  } catch (error) {
    // The unique index on automatic evaluations caught a run that slipped past the lock.
    if (!isUniqueViolation(error)) throw error;
    const winner = await currentAutomaticEvaluation(db, attemptId);
    if (!winner) throw error;
    return asResult(winner, false);
  }
}

async function scoreInTransaction(tx: Prisma.TransactionClient, attemptId: string, userId: string): Promise<ScoreAttemptResult | null> {
  const attempt = await tx.assessmentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      status: true,
      rubricVersionId: true,
      submissions: { orderBy: { revision: "desc" }, take: 1, select: { id: true, responses: true } },
      rubricVersion: { select: { criteria: { select: { id: true, skillId: true } } } },
      assessmentVersion: {
        select: {
          skills: { select: { skillId: true } },
          questions: {
            orderBy: { position: "asc" },
            select: { id: true, type: true, prompt: true, options: true, answerKey: true, explanation: true, skillId: true, difficulty: true, estimatedMinutes: true },
          },
        },
      },
    },
  });
  const submission = attempt.submissions[0];
  if (attempt.status !== "SUBMITTED" || !submission?.responses) return null;

  // Scoring is pure and happens before any write, so a permanent failure can still be
  // recorded in this same transaction.
  let score: ObjectiveScore;
  try {
    const questions = attempt.assessmentVersion.questions.map((row) => {
      const content = decodeQuestion(row);
      // Published questions were validated when saved, so this means corrupted data or a
      // validation rule that changed after publishing.
      if (!content) throw new UnscorableAttemptError(`Question ${row.id} cannot be read for scoring.`);
      return { id: row.id, content };
    });
    score = scoreObjectiveAttempt(questions, submission.responses as Record<string, unknown>);
  } catch (error) {
    if (!isPermanent(error)) throw error;
    return recordFailure(tx, { attemptId, submissionId: submission.id, rubricVersionId: attempt.rubricVersionId }, (error as Error).message);
  }

  const evaluation = await tx.evaluation.create({
    data: {
      attemptId,
      submissionId: submission.id,
      rubricVersionId: attempt.rubricVersionId,
      evaluatorType: "AUTOMATIC",
      promptVersion: AUTO_FORMULA_VERSION,
      // Scored by code from the answer key, so no person needs to review it.
      reviewStatus: "NOT_REQUIRED",
    },
    select: { id: true },
  });

  await tx.evaluationCriterionScore.createMany({
    data: attempt.rubricVersion.criteria.map((criterion) => {
      const result = criterionResult(score, criterion.skillId);
      return {
        evaluationId: evaluation.id,
        rubricVersionId: attempt.rubricVersionId,
        criterionId: criterion.id,
        score: result.percent,
        rationale: `${AUTO_FORMULA_VERSION}: ${result.correctCount} of ${result.questionCount} correct`,
      };
    }),
  });
  await tx.evaluationSkillResult.createMany({
    data: score.skills.map((s) => ({
      evaluationId: evaluation.id,
      skillId: s.skillId,
      questionCount: s.questionCount,
      answeredCount: s.answeredCount,
      correctCount: s.correctCount,
      percent: s.percent,
    })),
  });
  await tx.evaluation.update({
    where: { id: evaluation.id },
    data: { status: "COMPLETED", overallScore: score.percent, completedAt: new Date() },
  });

  // Verified scores only for the skills the assessment declares: the database accepts an
  // evaluation as evidence only for those.
  const declared = new Set(attempt.assessmentVersion.skills.map((s) => s.skillId));
  for (const skill of score.skills) {
    if (declared.has(skill.skillId)) await recalculateVerifiedScore(tx, userId, skill.skillId);
  }

  return { evaluationId: evaluation.id, created: true, status: "COMPLETED" };
}

/**
 * Records that the attempt cannot be scored automatically. The reason is for administrators
 * and the server log; candidates only see that scoring failed. A FAILED evaluation has no
 * scores and never counts toward a verified score.
 */
async function recordFailure(
  tx: Prisma.TransactionClient,
  ids: { attemptId: string; submissionId: string; rubricVersionId: string },
  reason: string,
): Promise<ScoreAttemptResult> {
  const evaluation = await tx.evaluation.create({
    data: { ...ids, evaluatorType: "AUTOMATIC", promptVersion: AUTO_FORMULA_VERSION, reviewStatus: "NOT_REQUIRED", summary: reason },
    select: { id: true },
  });
  await tx.evaluation.update({ where: { id: evaluation.id }, data: { status: "FAILED", completedAt: new Date() } });
  return { evaluationId: evaluation.id, created: true, status: "FAILED" };
}

/**
 * A criterion linked to a skill gets that skill's result; any other criterion gets the overall
 * result. Rubric weights do not change automatic scores: every question counts the same.
 */
function criterionResult(score: ObjectiveScore, skillId: string | null) {
  return score.skills.find((s) => s.skillId === skillId) ?? score;
}

/** Recalculates one verified score from every automatic result the candidate has for the skill. */
async function recalculateVerifiedScore(tx: Prisma.TransactionClient, userId: string, skillId: string) {
  const results = await tx.evaluationSkillResult.findMany({
    where: {
      skillId,
      evaluation: {
        evaluatorType: "AUTOMATIC",
        status: "COMPLETED",
        reviewStatus: { not: "REJECTED" },
        supersededBy: { is: null },
        attempt: { candidateUserId: userId, assessmentVersion: { skills: { some: { skillId } } } },
      },
    },
    select: {
      percent: true,
      answeredCount: true,
      evaluation: {
        select: { id: true, completedAt: true, attempt: { select: { assessmentVersion: { select: { assessmentId: true, difficulty: true } } } } },
      },
    },
  });

  const inputs: SkillEvaluationInput[] = results.map((r) => ({
    evaluationId: r.evaluation.id,
    assessmentId: r.evaluation.attempt.assessmentVersion.assessmentId,
    // Every automatic evaluation gets its completion time when it completes, above.
    completedAt: r.evaluation.completedAt ?? new Date(0),
    difficulty: r.evaluation.attempt.assessmentVersion.difficulty,
    percent: Number(r.percent),
    answeredCount: r.answeredCount,
  }));

  const calculation = calculateVerifiedSkillScore(inputs);
  if (calculation) await recordVerifiedSkillScoreInTransaction(tx, { userId, skillId, ...calculation });
}
