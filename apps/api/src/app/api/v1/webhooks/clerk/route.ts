import { verifyWebhook } from "@clerk/backend/webhooks";
import { getClerk } from "../../../../../lib/auth/clerk";
import { syncFromClerk } from "../../../../../lib/auth/identity-sync";
import { getDb } from "../../../../../lib/db";
import { getEnv } from "../../../../../lib/env";
import { fail, ok, unavailable, withErrorHandling } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

const USER_EVENTS = new Set(["user.created", "user.updated", "user.deleted"]);

/** Any failure after verification returns a 5xx, so Clerk retries the delivery. */
export const POST = withErrorHandling(async (request: Request) => {
  const signingSecret = getEnv().CLERK_WEBHOOK_SIGNING_SECRET;
  const db = getDb();
  if (!signingSecret || !db) throw unavailable();

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    return fail("BAD_REQUEST", "Invalid webhook signature.", 400);
  }

  const userId = event.data.id;
  if (USER_EVENTS.has(event.type) && typeof userId === "string") {
    await syncFromClerk(db, getClerk(), userId);
  }
  return ok({ received: true });
});
