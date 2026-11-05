import { updatePrivacy } from "@skillprove/database";
import { privacyInputSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import { parseBody, requireDb } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

/** The whole privacy choice at once. Changes are audited. */
export const PUT = withAuth(async (request, user) => {
  const input = await parseBody(request, privacyInputSchema);
  return ok(await updatePrivacy(requireDb(), user.id, input));
});
