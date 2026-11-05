import { getCandidateView } from "@skillprove/database";
import { z } from "zod";
import { withAuth } from "../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../lib/http";
import { contentLocale, requireDb, type RouteContext } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

/**
 * One candidate profile, filtered by that candidate's privacy settings for this viewer.
 * Being signed in is not enough: the viewer's company memberships, read from the database,
 * decide access. A refused, missing or inactive profile all return the same 404.
 * There is no listing or search here; that is a later milestone.
 */
export const GET = withAuth(async (request, user, context: RouteContext<{ profileId: string }>) => {
  const { profileId } = await context.params;
  if (!z.uuid().safeParse(profileId).success) throw notFound();
  const view = await getCandidateView(requireDb(), profileId, user.id, contentLocale(request, user));
  if (!view) throw notFound();
  return ok(view);
});
