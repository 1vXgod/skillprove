import { fail } from "../../../lib/http";

export const dynamic = "force-dynamic";

/** Unknown API paths return the standard error format rather than an HTML page. */
function notFound() {
  return fail("NOT_FOUND", "This API endpoint does not exist.", 404);
}

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
};
