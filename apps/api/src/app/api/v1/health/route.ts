import { API_VERSION } from "@skillprove/shared";
import type { Health } from "@skillprove/validation";
import { ok, withErrorHandling } from "../../../../lib/http";

export const dynamic = "force-dynamic";

/** Liveness: the API process is up. Does not touch the database. */
export const GET = withErrorHandling(() =>
  ok<Health>({
    status: "ok",
    service: "skillprove-api",
    apiVersion: API_VERSION,
    timestamp: new Date().toISOString(),
  }),
);
