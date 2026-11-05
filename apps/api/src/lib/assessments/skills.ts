import { getAssessment, type PrismaClient } from "@skillprove/database";
import { badRequest } from "../http";

/** A question may only measure a skill the assessment declares, so weights and rubric stay consistent. */
export async function requireSkillInAssessment(db: PrismaClient, companyId: string, assessmentId: string, skillId: string) {
  const record = await getAssessment(db, companyId, assessmentId);
  if (!record.working.skills.some((s) => s.skillId === skillId)) throw badRequest({ skillId: "invalidChoice" });
}
