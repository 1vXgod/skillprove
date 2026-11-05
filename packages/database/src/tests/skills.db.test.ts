import { describe, expect, it } from "vitest";
import { recordVerifiedSkillScore } from "../repositories/verified-skill-scores";
import { seedSkillTaxonomy } from "../seed/skill-taxonomy";
import { SKILL_CATEGORIES, SKILLS } from "../seed/skill-taxonomy-data";
import {
  createCompletedEvaluation,
  createSkill,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

const score = { confidence: 70, highestDifficulty: "INTERMEDIATE", formulaVersion: "test" } as const;

describe.skipIf(hasNoTestDatabase)("skills", () => {
  const db = useTestDatabase();
  const slug = () => `test-${crypto.randomUUID()}`;

  it("builds a category hierarchy", async () => {
    const parent = await db.skillCategory.create({ data: { slug: slug() } });
    const child = await db.skillCategory.create({ data: { slug: slug(), parentId: parent.id } });

    const found = await db.skillCategory.findUniqueOrThrow({
      where: { id: parent.id },
      include: { children: true },
    });
    expect(found.children.map((c) => c.id)).toEqual([child.id]);
  });

  it("rejects category cycles", async () => {
    const a = await db.skillCategory.create({ data: { slug: slug() } });
    const b = await db.skillCategory.create({ data: { slug: slug(), parentId: a.id } });
    const c = await db.skillCategory.create({ data: { slug: slug(), parentId: b.id } });

    await expect(
      db.skillCategory.update({ where: { id: a.id }, data: { parentId: c.id } }),
    ).rejects.toThrow(/cycle/);
    await expect(
      db.skillCategory.update({ where: { id: a.id }, data: { parentId: a.id } }),
    ).rejects.toThrow();
  });

  it("stores translations and resolves aliases", async () => {
    const skill = await createSkill(db);
    await db.skillTranslation.createMany({
      data: [
        { skillId: skill.id, locale: "sq", name: "Testim" },
        { skillId: skill.id, locale: "en", name: "Testing" },
      ],
    });
    const normalizedAlias = slug();
    await db.skillAlias.create({
      data: { skillId: skill.id, alias: normalizedAlias, normalizedAlias },
    });

    const found = await db.skillAlias.findUniqueOrThrow({
      where: { normalizedAlias },
      include: { skill: { include: { translations: true } } },
    });
    expect(found.skill.translations).toHaveLength(2);
    await expect(
      db.skillAlias.create({
        data: { skillId: skill.id, alias: "Mixed", normalizedAlias: "Mixed" },
      }),
    ).rejects.toThrow();
  });

  it("keeps self-reported levels apart from verified scores", async () => {
    const [user, skill] = [await createUser(db), await createSkill(db)];
    await db.userSkill.create({
      data: { userId: user.id, skillId: skill.id, selfReportedLevel: "EXPERT" },
    });

    expect(await db.verifiedSkillScore.count({ where: { userId: user.id } })).toBe(0);

    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
      score: 55,
    });
    await recordVerifiedSkillScore(db, {
      ...score,
      userId: user.id,
      skillId: skill.id,
      score: 55,
      evidence: [{ evaluationId: evaluation.id, weight: 100 }],
    });

    const claimed = await db.userSkill.findFirstOrThrow({ where: { userId: user.id } });
    const verified = await db.verifiedSkillScore.findFirstOrThrow({ where: { userId: user.id } });
    expect(claimed.selfReportedLevel).toBe("EXPERT");
    expect(verified.score.toNumber()).toBe(55);
  });

  it("refuses a calculation without evidence", async () => {
    const [user, skill] = [await createUser(db), await createSkill(db)];
    await expect(
      recordVerifiedSkillScore(db, {
        ...score,
        userId: user.id,
        skillId: skill.id,
        score: 90,
        evidence: [],
      }),
    ).rejects.toThrow();
    expect(await db.verifiedSkillScore.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses evidence from another candidate or for another skill", async () => {
    const [user, other, skill, otherSkill] = [
      await createUser(db),
      await createUser(db),
      await createSkill(db),
      await createSkill(db),
    ];
    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: other.id,
    });
    const attempt = (userId: string, skillId: string) =>
      recordVerifiedSkillScore(db, {
        ...score,
        userId,
        skillId,
        score: 90,
        evidence: [{ evaluationId: evaluation.id, weight: 100 }],
      });

    await expect(attempt(user.id, skill.id)).rejects.toThrow(/valid evidence/);
    await expect(attempt(other.id, otherSkill.id)).rejects.toThrow(/valid evidence/);
    await expect(attempt(other.id, skill.id)).resolves.toBeDefined();
  });

  it("discards direct edits to a verified score", async () => {
    const [user, skill] = [await createUser(db), await createSkill(db)];
    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
    });
    const verified = await recordVerifiedSkillScore(db, {
      ...score,
      userId: user.id,
      skillId: skill.id,
      score: 60,
      evidence: [{ evaluationId: evaluation.id, weight: 100 }],
    });

    const edited = await db.verifiedSkillScore.update({
      where: { id: verified.id },
      data: { score: 100, confidence: 100 },
    });
    expect(edited.score.toNumber()).toBe(60);
    expect(edited.confidence.toNumber()).toBe(70);
  });

  it("traces a verified score back to its evidence, keeping history", async () => {
    const [user, skill] = [await createUser(db), await createSkill(db)];
    const first = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
      score: 50,
    });
    const second = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
      score: 90,
    });
    for (const [item, value] of [
      [first, 50],
      [second, 70],
    ] as const) {
      await recordVerifiedSkillScore(db, {
        ...score,
        userId: user.id,
        skillId: skill.id,
        score: value,
        evidence: [{ evaluationId: item.evaluation.id, weight: 100 }],
      });
    }

    const current = await db.verifiedSkillScore.findFirstOrThrow({
      where: { userId: user.id },
      include: {
        calculation: {
          include: { inputs: { include: { evaluation: { include: { criterionScores: true } } } } },
        },
      },
    });
    expect(current.score.toNumber()).toBe(70);
    expect(current.calculation.inputs[0]?.evaluation.id).toBe(second.evaluation.id);
    expect(current.calculation.inputs[0]?.evaluation.criterionScores).toHaveLength(1);
    expect(
      await db.verifiedSkillScoreCalculation.count({ where: { userId: user.id } }),
    ).toBe(2);
    await expect(
      db.verifiedSkillScoreCalculation.update({
        where: { id: current.calculationId },
        data: { score: 1 },
      }),
    ).rejects.toThrow(/immutable/);
  });

  it("does not let a score use a rejected evaluation", async () => {
    const [user, skill, reviewer] = [
      await createUser(db),
      await createSkill(db),
      await createUser(db),
    ];
    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: user.id,
    });
    await db.evaluationReview.create({
      data: { evaluationId: evaluation.id, reviewerId: reviewer.id, decision: "REJECTED" },
    });
    await expect(
      recordVerifiedSkillScore(db, {
        ...score,
        userId: user.id,
        skillId: skill.id,
        score: 80,
        evidence: [{ evaluationId: evaluation.id, weight: 100 }],
      }),
    ).rejects.toThrow(/valid evidence/);
  });

  it("seeds the taxonomy repeatedly without changing the result", async () => {
    const slugs = {
      categories: SKILL_CATEGORIES.map((c) => c.slug),
      skills: SKILLS.map((s) => s.slug),
    };
    const counts = async () => ({
      categories: await db.skillCategory.count({ where: { slug: { in: slugs.categories } } }),
      skills: await db.skill.count({ where: { slug: { in: slugs.skills } } }),
      translations: await db.skillTranslation.count({
        where: { skill: { slug: { in: slugs.skills } } },
      }),
      aliases: await db.skillAlias.count({ where: { skill: { slug: { in: slugs.skills } } } }),
    });

    await seedSkillTaxonomy(db);
    const first = await counts();
    const before = await db.skill.findUniqueOrThrow({ where: { slug: "typescript" } });
    await seedSkillTaxonomy(db);

    expect(await counts()).toEqual(first);
    expect(first.categories).toBe(SKILL_CATEGORIES.length);
    expect(first.skills).toBe(SKILLS.length);
    expect(first.translations).toBe(SKILLS.length * 2);
    expect((await db.skill.findUniqueOrThrow({ where: { slug: "typescript" } })).id).toBe(before.id);

    const web = await db.skillCategory.findUniqueOrThrow({
      where: { slug: "web-development" },
      include: { parent: true, translations: true },
    });
    expect(web.parent?.slug).toBe("software-development");
    expect(web.translations.map((t) => t.locale).sort()).toEqual(["en", "sq"]);
  }, 120_000);

  it("seeds no people, companies or scores", () => {
    const text = JSON.stringify({ SKILL_CATEGORIES, SKILLS });
    expect(text).not.toMatch(/@|"score"/);
  });
});
