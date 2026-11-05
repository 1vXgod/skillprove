import { removeSelfReportedSkill, updateSelfReportedSkill } from "@skillprove/database";
import { selfReportedSkillUpdateSchema } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../lib/http";
import { contentLocale, parseBody, requireDb, type RouteContext } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

type Params = RouteContext<{ skillId: string }>;

async function skillIdFrom(context: Params) {
  const { skillId } = await context.params;
  if (!z.uuid().safeParse(skillId).success) throw notFound();
  return skillId;
}

export const PUT = withAuth(async (request, user, context: Params) => {
  const skillId = await skillIdFrom(context);
  const { expectedUpdatedAt, ...data } = await parseBody(request, selfReportedSkillUpdateSchema);
  return ok(await updateSelfReportedSkill(requireDb(), user.id, skillId, data, expectedUpdatedAt, contentLocale(request, user)));
});

export const DELETE = withAuth(async (_request, user, context: Params) => {
  await removeSelfReportedSkill(requireDb(), user.id, await skillIdFrom(context));
  return ok({ deleted: true });
});
