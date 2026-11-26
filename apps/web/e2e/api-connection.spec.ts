import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { createTranslator } from "@skillprove/shared/i18n";

const HEALTH_URL = "http://localhost:4100/api/v1/health";
// The connection check lives on the internal design-system page, not on any page users see.
const STATUS_PAGE = "/design-system";
// Albanian is the default language.
const t = createTranslator("sq");

test("an allowed origin reads the API from a real browser", async ({ page }) => {
  const healthResponse = page.waitForResponse(HEALTH_URL);
  await page.goto(STATUS_PAGE);

  const response = await healthResponse;
  expect(response.headers()["access-control-allow-origin"]).toBe("http://localhost:3100");
  await expect(page.getByTestId("api-status")).toHaveText(t("status.connected"));
});

test("the database error state appears when no database is configured", async ({ page }) => {
  await page.goto(STATUS_PAGE);
  await expect(page.getByTestId("database-status")).toHaveText(t("status.unavailable"));
});

// The build reads keys from the environment or .env.local, so check both the same way.
function buildHasClerkKey() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return true;
  const file = fileURLToPath(new URL("../.env.local", import.meta.url));
  return existsSync(file) && /^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=\S/m.test(readFileSync(file, "utf8"));
}
const hasClerkKey = buildHasClerkKey();

test.describe("without Clerk keys", () => {
  test.skip(hasClerkKey, "Keys are configured.");
  for (const path of ["/sign-in", "/sign-up", "/account"]) {
    test(`${path} says sign-in is unavailable rather than faking it`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId("auth-not-configured")).toBeVisible();
    });
  }
});

test.describe("with Clerk keys", () => {
  test.skip(!hasClerkKey, "Keys are not configured.");
  test("/account redirects a signed-out visitor to our sign-in page", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=/);
  });
  for (const path of ["/sign-in", "/sign-up"]) {
    test(`${path} renders Clerk's form`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("input[name=identifier], input[name=emailAddress]").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("auth-not-configured")).toHaveCount(0);
    });
  }
});

test("the API refuses private routes from a browser with no token", async ({ request }) => {
  const response = await request.get("http://localhost:4100/api/v1/me");
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
});

test("the browser blocks an origin that is not allowed", async ({ page }) => {
  // Same server, but 127.0.0.1 is a different origin from the allowed http://localhost:3100.
  await page.goto(`http://127.0.0.1:3100${STATUS_PAGE}`);
  await expect(page.getByTestId("api-status")).toHaveText(t("status.unavailable"));
});
