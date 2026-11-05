import { deleteSectionItem, updateSectionItem } from "@skillprove/database";
import { sectionUpdateSchemas } from "@skillprove/validation";
import { z } from "zod";
import { withAuth } from "../../../../../../../lib/auth/guards";
import { notFound, ok } from "../../../../../../../lib/http";
import { parseBody, requireDb, type RouteContext } from "../../../../../../../lib/request";
import { parseSection } from "../../../../../../../lib/sections";

export const dynamic = "force-dynamic";

type Params = RouteContext<{ section: string; id: string }>;

async function resolve(context: Params) {
  const { section, id } = await context.params;
  // A malformed ID cannot belong to the user, and is reported the same way as a missing one.
  if (!z.uuid().safeParse(id).success) throw notFound();
  return { section: parseSection(section), id };
}

/** Replaces one item. Only items on the signed-in user's own profile can be reached. */
export const PUT = withAuth(async (request, user, context: Params) => {
  const { section, id } = await resolve(context);
  const db = requireDb();
  switch (section) {
    case "experiences": {
      const { expectedUpdatedAt, ...data } = await parseBody(request, sectionUpdateSchemas.experiences);
      return ok(await updateSectionItem(db, user.id, section, id, data, expectedUpdatedAt));
    }
    case "education": {
      const { expectedUpdatedAt, ...data } = await parseBody(request, sectionUpdateSchemas.education);
      return ok(await updateSectionItem(db, user.id, section, id, data, expectedUpdatedAt));
    }
    case "certificates": {
      const { expectedUpdatedAt, ...data } = await parseBody(request, sectionUpdateSchemas.certificates);
      return ok(await updateSectionItem(db, user.id, section, id, data, expectedUpdatedAt));
    }
    case "portfolio": {
      const { expectedUpdatedAt, ...data } = await parseBody(request, sectionUpdateSchemas.portfolio);
      return ok(await updateSectionItem(db, user.id, section, id, data, expectedUpdatedAt));
    }
    case "languages": {
      const { expectedUpdatedAt, ...data } = await parseBody(request, sectionUpdateSchemas.languages);
      return ok(await updateSectionItem(db, user.id, section, id, data, expectedUpdatedAt));
    }
  }
});

export const DELETE = withAuth(async (_request, user, context: Params) => {
  const { section, id } = await resolve(context);
  await deleteSectionItem(requireDb(), user.id, section, id);
  return ok({ deleted: true });
});
