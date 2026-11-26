import { expect, test, type Page } from "@playwright/test";
import { createTranslator, type Locale } from "@skillprove/shared/i18n";

async function setPreferences(page: Page, locale: Locale, theme: "light" | "dark") {
  await page.context().addCookies([
    { name: "sp-locale", value: locale, url: "http://localhost:3100" },
    { name: "sp-theme", value: theme, url: "http://localhost:3100" },
  ]);
}

test.describe("landing page", () => {
  test("is in Albanian by default, with sign-in and sign-up", async ({ page }) => {
    const t = createTranslator("sq");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: t("landing.heroTitleLead") })).toBeVisible();
    const hero = page.locator("section").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: t("auth.createAccount") })).toHaveAttribute("href", "/sign-up");
    await expect(hero.getByRole("link", { name: t("auth.signIn") })).toHaveAttribute("href", "/sign-in");
  });

  test("explains both sides, marks companies as coming soon and offers them no button", async ({ page }) => {
    const t = createTranslator("sq");
    await page.goto("/");
    const candidates = page.locator("#candidates");
    await expect(candidates.getByRole("listitem")).toHaveCount(3);
    await expect(candidates.getByRole("heading", { name: t("landing.candidateSteps.passport.title") })).toBeVisible();

    const companies = page.locator("#companies");
    await expect(companies.getByText(t("landing.comingSoon"))).toBeVisible();
    await expect(companies.getByRole("listitem")).toHaveCount(3);
    await expect(companies.getByRole("link")).toHaveCount(0);
    await expect(companies.getByRole("button")).toHaveCount(0);
  });

  test("never shows the old system status", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("api-status")).toHaveCount(0);
    await expect(page.getByTestId("database-status")).toHaveCount(0);
    // The page is rendered on the server and does not call the API.
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("http://localhost:4100")) calls.push(request.url());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(calls).toEqual([]);
  });

  test("is dark until the visitor chooses a theme, then follows the choice", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-landing]")).toHaveAttribute("data-theme", "dark");
    await setPreferences(page, "sq", "light");
    await page.reload();
    await expect(page.locator("[data-landing]")).not.toHaveAttribute("data-theme", /.*/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("has no links in the footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link")).toHaveCount(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`works in English, ${theme} mode, on a 360 px phone without horizontal scrolling`, async ({ page }) => {
      const t = createTranslator("en");
      await setPreferences(page, "en", theme);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { level: 1, name: t("landing.heroTitleLead") })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }

  test("fits a 360 px phone in Albanian, the longer language", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
