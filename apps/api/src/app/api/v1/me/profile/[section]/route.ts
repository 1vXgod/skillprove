import { addSectionItem } from "@skillprove/database";
import { sectionCreateSchemas } from "@skillprove/validation";
import { withAuth } from "../../../../../../lib/auth/guards";
import { ok } from "../../../../../../lib/http";
import { parseBody, requireDb, type RouteContext } from "../../../../../../lib/request";
import { parseSection } from "../../../../../../lib/sections";

export const dynamic = "force-dynamic";

/** Adds an item to experiences, education, certificates, portfolio or languages. */
export const POST = withAuth(async (request, user, context: RouteContext<{ section: string }>) => {
  const section = parseSection((await context.params).section);
  const db = requireDb();
  switch (section) {
    case "experiences":
      return ok(await addSectionItem(db, user.id, section, await parseBody(request, sectionCreateSchemas.experiences)), 201);
    case "education":
      return ok(await addSectionItem(db, user.id, section, await parseBody(request, sectionCreateSchemas.education)), 201);
    case "certificates":
      return ok(await addSectionItem(db, user.id, section, await parseBody(request, sectionCreateSchemas.certificates)), 201);
    case "portfolio":
      return ok(await addSectionItem(db, user.id, section, await parseBody(request, sectionCreateSchemas.portfolio)), 201);
    case "languages":
      return ok(await addSectionItem(db, user.id, section, await parseBody(request, sectionCreateSchemas.languages)), 201);
  }
});
