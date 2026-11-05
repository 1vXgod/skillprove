import { getSkillPassport } from "@skillprove/database";
import { withAuth } from "../../../../../lib/auth/guards";
import { ok } from "../../../../../lib/http";
import { contentLocale, requireDb } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

/** Verified, in-assessment and self-reported skills, as three separate lists. Read-only. */
export const GET = withAuth(async (request, user) => {
  return ok(await getSkillPassport(requireDb(), user.id, contentLocale(request, user)));
});
