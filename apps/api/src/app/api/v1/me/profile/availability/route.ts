import { updateAvailability } from "@skillprove/database";
import { availabilityInputSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import { parseBody, requireDb } from "../../../../../../lib/request";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (request, user) => {
  const input = await parseBody(request, availabilityInputSchema);
  return ok(await updateAvailability(requireDb(), user.id, input));
});
