import { createProfile, deleteProfile, getOwnProfile, updateProfile } from "@skillprove/database";
import { profileInputSchema, profileUpdateSchema } from "@skillprove/validation";
import { withAuth } from "../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../lib/http";
import { parseBody, requireDb } from "../../../../../lib/request";

export const dynamic = "force-dynamic";

/** The signed-in candidate's own profile, with every section. */
export const GET = withAuth(async (_request, user) => {
  const profile = await getOwnProfile(requireDb(), user.id);
  if (!profile) throw notFound();
  return ok(profile);
});

export const POST = withAuth(async (request, user) => {
  const input = await parseBody(request, profileInputSchema);
  return ok(await createProfile(requireDb(), user.id, input), 201);
});

/** Full replacement of the basic details. `expectedUpdatedAt` guards against lost updates. */
export const PUT = withAuth(async (request, user) => {
  const input = await parseBody(request, profileUpdateSchema);
  return ok(await updateProfile(requireDb(), user.id, input));
});

export const DELETE = withAuth(async (_request, user) => {
  await deleteProfile(requireDb(), user.id);
  return ok({ deleted: true });
});
