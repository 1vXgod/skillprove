import { expect, test, type Page } from "@playwright/test";
import { colors } from "@skillprove/shared/design";
import { createTranslator } from "@skillprove/shared/i18n";

const sq = createTranslator("sq");
const en = createTranslator("en");

// The page runs on a production build here because playwright.config sets SKILLPROVE_DESIGN_SYSTEM.
const URL = "/design-system";

const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};
const bodyBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("preferences", () => {
  test("defaults to Albanian and the system theme", async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator("html")).toHaveAttribute("lang", "sq");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(sq("designSystem.title"));
  });

  test("system follows the device setting with no script involved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(URL);
    expect(await bodyBackground(page)).toBe(hexToRgb(colors.dark.background));
    await page.emulateMedia({ colorScheme: "light" });
    expect(await bodyBackground(page)).toBe(hexToRgb(colors.light.background));
  });

  test("switching language re-renders the page and survives a reload", async ({ page }) => {
    await page.goto(URL);
    await page.getByRole("button", { name: `${sq("language.label")}: ${sq("language.sq")}` }).click();
    await page.getByRole("menuitemradio", { name: en("language.en") }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en("designSystem.title"));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en("designSystem.title"));
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("switching theme applies at once and survives a reload with no flash", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(URL);
    await page.getByRole("button", { name: new RegExp(`^${sq("theme.label")}:`) }).click();
    await page.getByRole("menuitemradio", { name: sq("theme.dark") }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(hexToRgb(colors.dark.background));

    // The server renders the stored theme, so the first HTML already has it.
    const response = await page.request.get(URL);
    expect(await response.text()).toContain('data-theme="dark"');
    await page.reload();
    expect(await bodyBackground(page)).toBe(hexToRgb(colors.dark.background));
  });
});

test("renders without page errors or hydration mismatches", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

/**
 * Network idle can come before React has hydrated when tests run in parallel, and a key press
 * before then has no handler. React attaches a fiber to each element once it hydrates.
 */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const tab = document.querySelector('[role="tab"]');
    return tab !== null && Object.keys(tab).some((key) => key.startsWith("__reactFiber"));
  });
}

test.describe("components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await waitForHydration(page);
  });

  test("buttons expose loading and disabled states", async ({ page }) => {
    const loading = page.getByRole("button", { name: sq("designSystem.examples.loading") });
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading).toBeDisabled();
    await expect(page.getByRole("button", { name: sq("designSystem.examples.disabled"), exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: sq("designSystem.examples.settings") }).first()).toBeVisible();
  });

  test("inputs link labels, help and validation messages", async ({ page }) => {
    const email = page.getByLabel(sq("designSystem.examples.emailLabel")).first();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription(sq("designSystem.examples.emailError"));
    await email.fill("arta@example.com");
    await expect(email).not.toHaveAttribute("aria-invalid");
    await expect(email).toHaveAccessibleDescription(sq("designSystem.examples.emailHelper"));
    await expect(page.getByLabel(sq("designSystem.examples.disabledLabel"))).toBeDisabled();

    const password = page.getByLabel(sq("designSystem.examples.passwordLabel"), { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: sq("components.showPassword") }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: sq("components.hidePassword") })).toHaveAttribute("aria-pressed", "true");
  });

  test("selection controls work from the keyboard", async ({ page }) => {
    const terms = page.getByRole("checkbox", { name: sq("designSystem.examples.termsLabel") });
    await terms.focus();
    await page.keyboard.press("Space");
    await expect(terms).toBeChecked();

    const updates = page.getByRole("switch", { name: sq("designSystem.examples.notificationsLabel") });
    await expect(updates).toBeChecked();
    await updates.focus();
    await page.keyboard.press("Space");
    await expect(updates).not.toBeChecked();

    const group = page.getByRole("group", { name: sq("designSystem.examples.contactLabel") });
    await group.getByRole("radio", { name: sq("designSystem.examples.contactEmail") }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(group.getByRole("radio", { name: sq("designSystem.examples.contactPhone") })).toBeChecked();
  });

  test("dialog traps focus, closes with Escape and returns focus", async ({ page }) => {
    const opener = page.getByRole("button", { name: sq("designSystem.examples.openDialog") });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: sq("designSystem.examples.dialogTitle") });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(sq("designSystem.examples.dialogBody"));
    // The page behind is inert. Tab may leave for the browser's own toolbar (the native
    // behaviour), but must never reach page content outside the dialog.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const focusStaysInDialog = await dialog.evaluate((node) => {
        const active = document.activeElement;
        return !active || active === document.body || node.contains(active);
      });
      expect(focusStaysInDialog).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("alert dialog starts on Cancel and does not confirm with Enter", async ({ page }) => {
    await page.getByRole("button", { name: sq("designSystem.examples.openAlertDialog") }).click();
    const alert = page.getByRole("alertdialog", { name: sq("designSystem.examples.alertDialogTitle") });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("button", { name: sq("common.cancel") })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(alert).toBeHidden();
  });

  test("menu follows the menu button pattern", async ({ page }) => {
    const trigger = page.getByRole("button", { name: sq("designSystem.examples.menu") });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(page.getByRole("menuitem", { name: sq("designSystem.examples.menuEdit") })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: sq("designSystem.examples.menuDuplicate") })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: sq("designSystem.examples.menuDelete") })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("tabs move with arrow keys and label their panels", async ({ page }) => {
    const first = page.getByRole("tab", { name: sq("designSystem.examples.tabOverview") });
    await first.focus();
    await page.keyboard.press("ArrowRight");
    const second = page.getByRole("tab", { name: sq("designSystem.examples.tabEvidence") });
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: sq("designSystem.examples.tabEvidence") })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: sq("designSystem.examples.tabHistory") })).toHaveAttribute("aria-selected", "true");
  });

  test("tooltip appears on focus and hides with Escape", async ({ page }) => {
    const settings = page.getByRole("button", { name: sq("designSystem.examples.settings") }).nth(1);
    await settings.focus();
    await expect(page.getByRole("tooltip")).toHaveText(sq("designSystem.examples.tooltip"));
    await expect(settings).toHaveAccessibleDescription(sq("designSystem.examples.tooltip"));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("progress, pagination and breadcrumb expose their state", async ({ page }) => {
    const progress = page.getByRole("progressbar", { name: sq("components.progress", { value: 64 }) });
    await expect(progress).toHaveAttribute("aria-valuenow", "64");
    const pagination = page.getByRole("navigation", { name: sq("components.pagination") });
    await expect(pagination.getByRole("button", { name: sq("components.currentPage", { page: 3 }) })).toHaveAttribute("aria-current", "page");
    await pagination.getByRole("button", { name: sq("components.page", { page: 4 }) }).click();
    await expect(pagination.getByRole("button", { name: sq("components.currentPage", { page: 4 }) })).toBeVisible();
    const crumbs = page.getByRole("navigation", { name: sq("components.breadcrumb") }).last();
    await expect(crumbs.getByText(sq("designSystem.examples.breadcrumbPage"))).toHaveAttribute("aria-current", "page");
  });

  test("badges, alerts and avatars carry text, not only colour", async ({ page }) => {
    await expect(page.getByRole("alert").filter({ hasText: sq("designSystem.examples.alertErrorTitle") })).toBeVisible();
    await expect(page.getByRole("img", { name: sq("designSystem.examples.sampleName") }).first()).toBeVisible();
  });
});

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe("application shell", () => {
  for (const width of [360, 768, 1280, 1920]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(URL);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });
  }

  test("uses a drawer below the lg breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL);
    const open = page.getByRole("button", { name: sq("shell.openNavigation") });
    await expect(open).toBeVisible();
    await open.click();
    const drawer = page.getByRole("dialog", { name: sq("shell.mainNavigation") });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: sq("nav.account") })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("shows a fixed sidebar from the lg breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(URL);
    await expect(page.getByRole("button", { name: sq("shell.openNavigation") })).toBeHidden();
    const sidebar = page.getByRole("navigation", { name: sq("shell.mainNavigation") }).first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: sq("nav.designSystem") })).toHaveAttribute("aria-current", "page");
  });

  test("marks unbuilt sections as unavailable instead of linking them", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(URL);
    const sidebar = page.getByRole("navigation", { name: sq("shell.mainNavigation") }).first();
    for (const key of ["nav.candidates", "nav.assessments", "nav.jobs"] as const) {
      await expect(sidebar.getByRole("link", { name: new RegExp(sq(key)) })).toHaveCount(0);
      await expect(sidebar.getByText(sq(key))).toBeVisible();
    }
    await expect(sidebar.getByText(sq("common.comingSoon")).first()).toBeVisible();
  });

  test("offers a skip link to the main content", async ({ page }) => {
    await page.goto(URL);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: sq("shell.skipToContent") });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });
});
