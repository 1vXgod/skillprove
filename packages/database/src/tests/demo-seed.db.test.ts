import { describe, expect, it } from "vitest";
import { listTakeableAssessments } from "../repositories/attempts";
import { DEMO_ASSESSMENTS, DEMO_COMPANY_SLUG, seedDemoData } from "../seed/demo";
import { seedSkillTaxonomy } from "../seed/skill-taxonomy";
import { createCandidate, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("demo seed", () => {
  const db = useTestDatabase();
  const ids = DEMO_ASSESSMENTS.map((a) => a.id);

  it("creates the demo company and takeable assessments once, and nothing more on a second run", async () => {
    await seedSkillTaxonomy(db);
    await seedDemoData(db);
    const again = await seedDemoData(db);

    expect(again).toEqual({ created: 0, existing: DEMO_ASSESSMENTS.length });
    expect(await db.company.count({ where: { slug: DEMO_COMPANY_SLUG } })).toBe(1);
    expect(await db.assessment.count({ where: { id: { in: ids } } })).toBe(DEMO_ASSESSMENTS.length);
    expect(await db.assessmentVersion.count({ where: { assessmentId: { in: ids } } })).toBe(DEMO_ASSESSMENTS.length);

    // A candidate sees every demo assessment as takeable.
    const candidate = await createCandidate(db);
    const listed = (await listTakeableAssessments(db, candidate.id, "en")).map((a) => a.assessmentId);
    for (const id of ids) expect(listed).toContain(id);
  });
});
