import { addSelfReportedSkill } from "@skillprove/database";
import { selfReportedSkillInputSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../lib/auth/guards";
import { ok } from "../../../../../lib/http";
import { contentLocale, parseBody, requireDb } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Adds a self-reported skill. There is no field for a score: verified results come only from evaluations. */
export const POST = withAuth(async (request, user) => {
  const { skillId, ...data } = await parseBody(request, selfReportedSkillInputSchema);
  return ok(await addSelfReportedSkill(requireDb(), user.id, skillId, data, contentLocale(request, user)), 201);
});
