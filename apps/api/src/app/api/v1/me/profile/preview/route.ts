import { getProfilePreview } from "@skillprove/database";
import { withAuth } from "../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../lib/http";
import { contentLocale, requireDb } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** The profile as an allowed company would see it under the current settings. */
export const GET = withAuth(async (request, user) => {
  const preview = await getProfilePreview(requireDb(), user.id, contentLocale(request, user));
  if (!preview) throw notFound();
  return ok(preview);
});
