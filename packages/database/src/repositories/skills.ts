import { PROFILE_LIMITS } from "@skillprove/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { SelfReportedLevel } from "../generated/prisma/enums";
import { CandidateDataError, isUniqueViolation } from "./candidate-errors";

export type SkillLocale = "sq" | "en";

/** Loads names in the requested language, with English as the fallback. */
export const skillWithNames = (locale: SkillLocale) =>
  ({ translations: { where: { locale: { in: [locale, "en"] } }, select: { locale: true, name: true } } }) satisfies Prisma.SkillInclude;

export function skillName(skill: { slug: string; translations: { locale: string; name: string }[] }, locale: SkillLocale): string {
  return (
    skill.translations.find((t) => t.locale === locale)?.name ??
    skill.translations.find((t) => t.locale === "en")?.name ??
    skill.slug
  );
}

export const toSkillRef = (skill: { id: string; slug: string; translations: { locale: string; name: string }[] }, locale: SkillLocale) => ({
  id: skill.id,
  slug: skill.slug,
  name: skillName(skill, locale),
});

/**
 * Active skills whose name (in any language) or alias contains the query. Ordered by slug,
 * with the last slug as an opaque cursor for the next page.
 */
export async function searchSkills(db: PrismaClient, options: { q: string; locale: SkillLocale; cursor?: string; limit: number }) {
  const q = options.q.trim().toLowerCase();
  const rows = await db.skill.findMany({
    where: {
      isActive: true,
      ...(options.cursor ? { slug: { gt: options.cursor } } : {}),
      ...(q
        ? {
            OR: [
              { translations: { some: { name: { contains: q, mode: "insensitive" } } } },
              { aliases: { some: { normalizedAlias: { contains: q } } } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    },
    include: { ...skillWithNames(options.locale), category: { include: { translations: { where: { locale: { in: [options.locale, "en"] } } } } } },
    orderBy: { slug: "asc" },
    take: options.limit + 1,
  });
  const page = rows.slice(0, options.limit);
  return {
    items: page.map((row) => ({ ...toSkillRef(row, options.locale), category: skillName(row.category, options.locale) })),
    nextCursor: rows.length > options.limit ? (page[page.length - 1]?.slug ?? null) : null,
  };
}

export interface SelfReportedSkillData {
  level: SelfReportedLevel;
  yearsOfExperience: number | null;
}

const toSelfReported = (
  row: Prisma.UserSkillGetPayload<{ include: { skill: { include: ReturnType<typeof skillWithNames> } } }>,
  locale: SkillLocale,
) => ({
  skill: toSkillRef(row.skill, locale),
  level: row.selfReportedLevel,
  yearsOfExperience: row.yearsOfExperience === null ? null : Number(row.yearsOfExperience),
  updatedAt: row.updatedAt.toISOString(),
});

export function listSelfReportedSkills(db: PrismaClient, userId: string, locale: SkillLocale) {
  return db.userSkill
    .findMany({
      where: { userId },
      include: { skill: { include: skillWithNames(locale) } },
      orderBy: [{ selfReportedLevel: "desc" }, { createdAt: "asc" }],
    })
    .then((rows) => rows.map((row) => toSelfReported(row, locale)));
}

/**
 * Records only what the candidate claims. Verified scores are in a separate table that this
 * module never writes, so nothing here can make a skill look verified.
 */
export async function addSelfReportedSkill(db: PrismaClient, userId: string, skillId: string, data: SelfReportedSkillData, locale: SkillLocale) {
  try {
    return await db.$transaction(async (tx) => {
      const skill = await tx.skill.findFirst({ where: { id: skillId, isActive: true }, select: { id: true } });
      if (!skill) throw new CandidateDataError("invalid_reference", "skillId");
      if ((await tx.userSkill.count({ where: { userId } })) >= PROFILE_LIMITS.skills) throw new CandidateDataError("limit", "skills");
      const row = await tx.userSkill.create({
        data: { userId, skillId, selfReportedLevel: data.level, yearsOfExperience: data.yearsOfExperience },
        include: { skill: { include: skillWithNames(locale) } },
      });
      return toSelfReported(row, locale);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CandidateDataError("duplicate", "skillId");
    throw error;
  }
}

export async function updateSelfReportedSkill(
  db: PrismaClient,
  userId: string,
  skillId: string,
  data: SelfReportedSkillData,
  expectedUpdatedAt: string,
  locale: SkillLocale,
) {
  const { count } = await db.userSkill.updateMany({
    where: { userId, skillId, updatedAt: new Date(expectedUpdatedAt) },
    data: { selfReportedLevel: data.level, yearsOfExperience: data.yearsOfExperience },
  });
  const row = await db.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId } },
    include: { skill: { include: skillWithNames(locale) } },
  });
  if (!row) throw new CandidateDataError("not_found");
  if (count === 0) throw new CandidateDataError("stale");
  return toSelfReported(row, locale);
}

export async function removeSelfReportedSkill(db: PrismaClient, userId: string, skillId: string) {
  const { count } = await db.userSkill.deleteMany({ where: { userId, skillId } });
  if (count === 0) throw new CandidateDataError("not_found");
}
