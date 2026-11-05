import { checkDatabaseConnection } from "@skillprove/database";
import type { Readiness } from "@skillprove/validation";
import { getDb } from "../../../../../lib/db";
import { fail, ok, withErrorHandling } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

/** Readiness: the API can serve traffic. The response never includes connection details. */
export const GET = withErrorHandling(async () => {
  const db = getDb();
  if (db) {
    try {
      await checkDatabaseConnection(db);
      return ok<Readiness>({ status: "ready", database: "connected" });
    } catch (error) {
      console.error("Readiness check failed", error);
    }
  }
  return fail("SERVICE_UNAVAILABLE", "The database is unavailable.", 503);
});
