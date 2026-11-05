import { searchSkills } from "@skillprove/database";
import { skillSearchQuerySchema } from "@skillprove/validation";
import { withAuth } from "../../../../lib/auth/guards";
import { ok } from "../../../../lib/http";
import { contentLocale, parseQuery, requireDb } from "../../../../lib/request";

export const dynamic = "force-dynamic";

/** The skill catalogue, for picking self-reported skills. Paged with an opaque cursor. */
export const GET = withAuth(async (request, user) => {
  const { q, cursor, limit } = parseQuery(request, skillSearchQuerySchema);
  return ok(await searchSkills(requireDb(), { q, cursor, limit, locale: contentLocale(request, user) }));
});
