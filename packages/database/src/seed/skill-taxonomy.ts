import type { PrismaClient } from "../generated/prisma/client";
import { SKILL_CATEGORIES, SKILLS } from "./skill-taxonomy-data";

const LOCALES = ["sq", "en"] as const;

/**
 * Reference data only: no users, companies or scores. Safe to repeat, because every write is
 * an upsert on a natural key. Entries removed from the data files are not deleted.
 */
export async function seedSkillTaxonomy(client: PrismaClient) {
  const categoryIds = new Map<string, string>();

  for (const [sortOrder, { slug, parent, name }] of SKILL_CATEGORIES.entries()) {
    const parentId = parent ? categoryIds.get(parent) : null;
    if (parentId === undefined) throw new Error(`Category ${slug} is listed before its parent.`);

    const category = await client.skillCategory.upsert({
      where: { slug },
      create: { slug, parentId, sortOrder },
      update: { parentId, sortOrder },
    });
    categoryIds.set(slug, category.id);

    for (const locale of LOCALES) {
      await client.skillCategoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        create: { categoryId: category.id, locale, name: name[locale] },
        update: { name: name[locale] },
      });
    }
  }

  for (const { slug, category, name, aliases = [] } of SKILLS) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Skill ${slug} uses unknown category ${category}.`);

    const skill = await client.skill.upsert({
      where: { slug },
      create: { slug, categoryId },
      update: { categoryId },
    });

    for (const locale of LOCALES) {
      await client.skillTranslation.upsert({
        where: { skillId_locale: { skillId: skill.id, locale } },
        create: { skillId: skill.id, locale, name: name[locale] },
        update: { name: name[locale] },
      });
    }

    for (const alias of aliases) {
      const normalizedAlias = alias.trim().toLowerCase();
      await client.skillAlias.upsert({
        where: { normalizedAlias },
        create: { skillId: skill.id, alias, normalizedAlias },
        update: { skillId: skill.id, alias },
      });
    }
  }

  return { categories: SKILL_CATEGORIES.length, skills: SKILLS.length };
}
