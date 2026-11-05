import type { PrismaClient } from "../generated/prisma/client";
import { listSelfReportedSkills, skillWithNames, toSkillRef, type SkillLocale } from "./skills";

/**
 * Verified results, read only from `VerifiedSkillScore` and the calculation that produced it.
 * Nothing is computed here: score, confidence and dates are exactly what the evaluation
 * pipeline recorded. Evidence is OUTDATED when an evaluation behind the current calculation
 * has since been superseded or rejected in review; the data model has no time-based expiry.
 */
export async function listVerifiedSkills(db: PrismaClient, userId: string, locale: SkillLocale) {
  const rows = await db.verifiedSkillScore.findMany({
    where: { userId },
    include: {
      skill: { include: skillWithNames(locale) },
      calculation: {
        select: {
          formulaVersion: true,
          inputs: {
            select: {
              evaluation: {
                select: {
                  id: true,
                  completedAt: true,
                  reviewStatus: true,
                  supersededBy: { select: { id: true } },
                  attempt: { select: { assessmentVersion: { select: { title: true } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ score: "desc" }, { lastVerifiedAt: "desc" }],
  });

  return rows.map((row) => {
    const evidence = row.calculation.inputs.map(({ evaluation }) => ({
      evaluationId: evaluation.id,
      assessmentTitle: evaluation.attempt.assessmentVersion.title,
      completedAt: evaluation.completedAt?.toISOString() ?? null,
      reviewStatus: evaluation.reviewStatus,
      superseded: evaluation.supersededBy !== null,
    }));
    const outdated = evidence.some((item) => item.superseded || item.reviewStatus === "REJECTED");
    return {
      skill: toSkillRef(row.skill, locale),
      score: Number(row.score),
      confidence: Number(row.confidence),
      assessmentCount: row.assessmentCount,
      highestDifficulty: row.highestDifficulty,
      lastVerifiedAt: row.lastVerifiedAt.toISOString(),
      evidenceStatus: outdated ? ("OUTDATED" as const) : ("CURRENT" as const),
      formulaVersion: row.calculation.formulaVersion,
      evidence,
    };
  });
}

/**
 * Skills measured by an attempt that is still open, or submitted with no completed evaluation.
 * An attempt past its expiry is no longer counted, even if no job has marked it expired yet.
 */
export async function listSkillsInAssessment(db: PrismaClient, userId: string, locale: SkillLocale, now = new Date()) {
  const attempts = await db.assessmentAttempt.findMany({
    where: { candidateUserId: userId, status: { in: ["IN_PROGRESS", "SUBMITTED"] } },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      expiresAt: true,
      evaluations: { where: { status: "COMPLETED" }, select: { id: true }, take: 1 },
      assessmentVersion: { select: { title: true, skills: { select: { skill: { include: skillWithNames(locale) } } } } },
    },
    orderBy: { startedAt: "desc" },
  });

  const bySkill = new Map<string, { skill: ReturnType<typeof toSkillRef>; attempts: { attemptId: string; assessmentTitle: string; stage: "IN_PROGRESS" | "AWAITING_EVALUATION"; startedAt: string; submittedAt: string | null }[] }>();
  for (const attempt of attempts) {
    const open = attempt.status === "IN_PROGRESS" && (attempt.expiresAt === null || attempt.expiresAt > now);
    const awaiting = attempt.status === "SUBMITTED" && attempt.evaluations.length === 0;
    if (!open && !awaiting) continue;
    for (const { skill } of attempt.assessmentVersion.skills) {
      const entry = bySkill.get(skill.id) ?? { skill: toSkillRef(skill, locale), attempts: [] };
      entry.attempts.push({
        attemptId: attempt.id,
        assessmentTitle: attempt.assessmentVersion.title,
        stage: open ? "IN_PROGRESS" : "AWAITING_EVALUATION",
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      });
      bySkill.set(skill.id, entry);
    }
  }
  return [...bySkill.values()];
}

/** The three lists are kept separate: a self-reported entry is never merged into a verified one. */
export async function getSkillPassport(db: PrismaClient, userId: string, locale: SkillLocale) {
  const [verified, inAssessment, selfReported] = await Promise.all([
    listVerifiedSkills(db, userId, locale),
    listSkillsInAssessment(db, userId, locale),
    listSelfReportedSkills(db, userId, locale),
  ]);
  return { verified, inAssessment, selfReported };
}
