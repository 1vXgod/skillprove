import { expect, test, type Page, type Route } from "@playwright/test";
import { createTranslator } from "@skillprove/shared/i18n";
import type { OwnProfile, ProfilePreview, SkillPassport } from "@skillprove/validation";

const t = createTranslator("sq");
const HARNESS = "/design-system/candidate";
const NOW = "2026-11-04T10:00:00.000Z";

const ownProfile = (overrides: Partial<OwnProfile> = {}): OwnProfile => ({
  id: "0f1e2d3c-4b5a-4968-8776-655443322110",
  fullName: "Arta Krasniqi",
  headline: "Analiste e të dhënave",
  biography: null,
  city: "Prishtinë",
  countryCode: "XK",
  phoneNumber: null,
  contactEmail: null,
  linkedinUrl: null,
  githubUrl: null,
  websiteUrl: null,
  interests: ["Të dhënat"],
  createdAt: NOW,
  updatedAt: NOW,
  availability: { status: "OPEN_TO_OFFERS", employmentTypes: [], workModes: ["REMOTE"], availableFrom: null, updatedAt: NOW },
  privacy: {
    visibility: "PRIVATE",
    isDiscoverable: false,
    showContactEmail: false,
    showPhoneNumber: false,
    showLocation: false,
    showExperience: false,
    showEducation: false,
    showVerifiedSkills: false,
    updatedAt: NOW,
  },
  experiences: [],
  education: [],
  certificates: [],
  portfolio: [],
  languages: [],
  ...overrides,
});

const skill = (id: string, name: string) => ({ id, slug: name.toLowerCase(), name });

const passport: SkillPassport = {
  verified: [
    {
      skill: skill("11111111-1111-4111-8111-111111111111", "SQL"),
      score: 72,
      confidence: 64,
      assessmentCount: 1,
      highestDifficulty: "INTERMEDIATE",
      lastVerifiedAt: NOW,
      evidenceStatus: "OUTDATED",
      formulaVersion: "v1",
      evidence: [{ evaluationId: "22222222-2222-4222-8222-222222222222", assessmentTitle: "Vlerësim SQL", completedAt: NOW, reviewStatus: "APPROVED", superseded: true }],
    },
  ],
  inAssessment: [
    {
      skill: skill("33333333-3333-4333-8333-333333333333", "Python"),
      attempts: [{ attemptId: "44444444-4444-4444-8444-444444444444", assessmentTitle: "Python bazë", stage: "AWAITING_EVALUATION", startedAt: NOW, submittedAt: NOW }],
    },
  ],
  selfReported: [
    { skill: skill("11111111-1111-4111-8111-111111111111", "SQL"), level: "EXPERT", yearsOfExperience: 4, updatedAt: NOW },
    { skill: skill("55555555-5555-4555-8555-555555555555", "Excel"), level: "ADVANCED", yearsOfExperience: null, updatedAt: NOW },
  ],
};

const preview = (profile: OwnProfile): ProfilePreview => ({
  visibility: profile.privacy.visibility,
  view: {
    id: profile.id,
    fullName: profile.fullName,
    headline: profile.headline,
    biography: profile.biography,
    interests: profile.interests,
    location: profile.privacy.showLocation ? { city: profile.city, countryCode: profile.countryCode } : null,
    contact: null,
    availability: { status: "OPEN_TO_OFFERS", employmentTypes: [], workModes: ["REMOTE"], availableFrom: null },
    languages: [],
    experiences: profile.privacy.showExperience ? [] : null,
    education: null,
    certificates: null,
    portfolio: [],
    selfReportedSkills: [],
    verifiedSkills: null,
  },
});

/** Answers API calls in the browser. Records requests so tests can check what was sent. */
async function mockApi(page: Page, handlers: Record<string, (route: Route, body: unknown) => unknown>) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  await page.route("http://localhost:4100/api/v1/**", async (route) => {
    const request = route.request();
    const cors = { "access-control-allow-origin": "http://localhost:3100", "access-control-allow-headers": "Authorization, Content-Type, Accept", "access-control-allow-methods": "GET, POST, PUT, DELETE" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const body: unknown = request.postData() ? JSON.parse(request.postData() ?? "null") : undefined;
    requests.push({ method: request.method(), path, body });
    const handler = handlers[`${request.method()} ${path}`];
    if (!handler) return route.fulfill({ status: 404, headers: cors, json: { success: false, error: { code: "NOT_FOUND", message: "Not found." } } });
    const result = (await handler(route, body)) as { status?: number; json: unknown } | undefined;
    if (result) await route.fulfill({ status: result.status ?? 200, headers: cors, json: result.json });
  });
  return requests;
}

const okJson = (data: unknown, status = 200) => ({ status, json: { success: true, data } });

async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("#main");
    return main !== null && Object.keys(main).some((key) => key.startsWith("__react"));
  });
}

test.describe("signed-out access", () => {
  for (const path of ["/profile", "/skill-passport", "/profile/privacy"]) {
    test(`${path} is not shown without a session`, async ({ page }) => {
      const response = await page.goto(path);
      const url = page.url();
      // With Clerk keys this redirects to sign-in; without them the page says sign-in is unavailable.
      if (url.includes("/sign-in")) expect(url).toContain(`redirect_url=`);
      else await expect(page.getByTestId("auth-not-configured")).toBeVisible();
      expect(response?.status()).toBeLessThan(500);
    });
  }
});

test.describe("profile screens", () => {
  test("creates a profile, checking input before it is sent", async ({ page }) => {
    let created: OwnProfile | null = null;
    const requests = await mockApi(page, {
      "GET /me/profile": () => (created ? okJson(created) : { status: 404, json: { success: false, error: { code: "NOT_FOUND", message: "Not found." } } }),
      "POST /me/profile": (_route, body) => {
        created = ownProfile({ fullName: (body as { fullName: string }).fullName });
        return okJson(created, 201);
      },
    });
    await page.goto(HARNESS);
    await hydrated(page);
    await expect(page.getByRole("heading", { name: t("profile.createTitle") })).toBeVisible();

    await page.getByLabel(t("profile.linkedinUrl")).fill("javascript:alert(1)");
    await page.getByRole("button", { name: t("profile.createAction") }).click();
    await expect(page.getByLabel(t("profile.fullName"))).toHaveAccessibleDescription(t("validation.required"));
    await expect(page.getByLabel(t("profile.linkedinUrl"))).toHaveAccessibleDescription(t("validation.invalidUrl"));
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(0);

    await page.getByLabel(t("profile.fullName")).fill("Arta Krasniqi");
    await page.getByLabel(t("profile.linkedinUrl")).fill("");
    await page.getByRole("button", { name: t("profile.createAction") }).click();
    await expect(page.getByRole("heading", { name: "Arta Krasniqi" })).toBeVisible();
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({ fullName: "Arta Krasniqi", countryCode: "XK" });
    await expect(page.getByText(t("experiences.empty"))).toBeVisible();
    await expect(page.getByText(t("profile.photoUnavailable"))).toBeVisible();
  });

  test("validates experience dates and reports a conflicting edit", async ({ page }) => {
    const requests = await mockApi(page, {
      "GET /me/profile": () => okJson(ownProfile()),
      "POST /me/profile/experiences": () => ({ status: 409, json: { success: false, error: { code: "CONFLICT", message: "Changed elsewhere." } } }),
    });
    await page.goto(HARNESS);
    await hydrated(page);
    await page.getByRole("button", { name: t("experiences.add") }).click();
    const dialog = page.getByRole("dialog", { name: t("experiences.add") });
    await dialog.getByLabel(t("experiences.jobTitle")).fill("Analiste");
    await dialog.getByLabel(t("experiences.company")).fill("Kompania");
    await dialog.getByLabel(t("experiences.startDate")).fill("2022-01-01");
    await dialog.getByLabel(t("experiences.endDate")).fill("2021-01-01");
    await dialog.getByRole("button", { name: t("common.save") }).click();
    await expect(dialog.getByLabel(t("experiences.endDate"))).toHaveAccessibleDescription(t("validation.endBeforeStart"));
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(0);

    await dialog.getByLabel(t("experiences.isCurrent")).check();
    await expect(dialog.getByLabel(t("experiences.endDate"))).toBeDisabled();
    await dialog.getByRole("button", { name: t("common.save") }).click();
    await expect(dialog.getByRole("alert")).toHaveText(t("errors.conflict"));
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({ isCurrent: true, endDate: null });
  });

  test("shows field errors returned by the API", async ({ page }) => {
    await mockApi(page, {
      "GET /me/profile": () => okJson(ownProfile()),
      "POST /me/profile/languages": () => ({ status: 409, json: { success: false, error: { code: "CONFLICT", message: "Exists.", fields: { languageCode: "duplicate" } } } }),
    });
    await page.goto(HARNESS);
    await hydrated(page);
    await page.getByRole("button", { name: t("languages.add") }).click();
    const dialog = page.getByRole("dialog", { name: t("languages.add") });
    await dialog.getByLabel(t("languages.language")).selectOption("en");
    await dialog.getByLabel(t("languages.proficiency")).selectOption("C1");
    await dialog.getByRole("button", { name: t("common.save") }).click();
    await expect(dialog.getByLabel(t("languages.language"))).toHaveAccessibleDescription(t("validation.duplicate"));
  });
});

test.describe("skill passport", () => {
  test("keeps verified, in-assessment and self-reported skills apart", async ({ page }) => {
    await mockApi(page, { "GET /me/skill-passport": () => okJson(passport) });
    await page.goto(`${HARNESS}?screen=passport`);
    await hydrated(page);

    const verified = page.getByTestId("verified-skills");
    await expect(verified.getByText("SQL", { exact: true })).toBeVisible();
    await expect(verified.getByText(t("passport.scoreOutOf", { score: "72" }))).toBeVisible();
    await expect(verified.getByText(t("passport.outdated"))).toBeVisible();
    await expect(verified.getByText(t("passport.outdatedBody"))).toBeVisible();
    // A verified result has no controls: it cannot be edited or removed by the candidate.
    await expect(verified.getByRole("button")).toHaveCount(0);

    await expect(page.getByTestId("skills-in-assessment").getByText(t("passport.stage.AWAITING_EVALUATION"))).toBeVisible();

    const selfReported = page.getByTestId("self-reported-skills");
    await expect(selfReported.getByText(t("passport.selfReported"), { exact: true })).toHaveCount(2);
    await expect(selfReported.getByText(t("passport.alsoVerified"))).toHaveCount(1);
    await expect(selfReported.getByText(t("passport.levels.EXPERT"))).toBeVisible();
    await expect(selfReported.getByRole("button", { name: `${t("common.edit")}: Excel` })).toBeVisible();
  });

  test("never offers a score field when editing a self-reported skill", async ({ page }) => {
    await mockApi(page, { "GET /me/skill-passport": () => okJson(passport) });
    await page.goto(`${HARNESS}?screen=passport`);
    await hydrated(page);
    await page.getByRole("button", { name: `${t("common.edit")}: SQL` }).click();
    const dialog = page.getByRole("dialog", { name: t("passport.editSkill") });
    await expect(dialog.getByLabel(t("passport.level"))).toBeVisible();
    await expect(dialog.getByLabel(t("passport.score"))).toHaveCount(0);
  });
});

test.describe("privacy settings", () => {
  test("saves the full choice with the version it edited, and previews the server's view", async ({ page }) => {
    let profile = ownProfile();
    const requests = await mockApi(page, {
      "GET /me/profile": () => okJson(profile),
      "GET /me/profile/preview": () => okJson(preview(profile)),
      "PUT /me/profile/privacy": (_route, body) => {
        // The extra expectedUpdatedAt key is dropped by the client's response schema.
        profile = ownProfile({ privacy: { ...profile.privacy, ...(body as Partial<OwnProfile["privacy"]>), updatedAt: "2026-11-04T11:00:00.000Z" } });
        return okJson(profile);
      },
    });
    await page.goto(`${HARNESS}?screen=privacy`);
    await hydrated(page);

    const previewCard = page.getByTestId("privacy-preview");
    await expect(previewCard.getByText(t("privacy.previewPrivate"))).toBeVisible();
    await expect(previewCard.getByText(t("common.hidden")).first()).toBeVisible();

    const save = page.getByRole("button", { name: t("common.save") });
    await expect(save).toBeDisabled();
    await page.getByRole("radio", { name: t("privacy.visibilities.VERIFIED_COMPANIES") }).check();
    await page.getByRole("switch", { name: t("privacy.showExperience") }).check();
    await save.click();
    await expect(page.getByText(t("privacy.saved"))).toBeVisible();

    const sent = requests.find((r) => r.method === "PUT")?.body;
    expect(sent).toMatchObject({ visibility: "VERIFIED_COMPANIES", showExperience: true, showContactEmail: false, expectedUpdatedAt: NOW });
    await expect(previewCard.getByText(t("privacy.previewPrivate"))).toHaveCount(0);
  });

  test("candidate screens fit a phone without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockApi(page, { "GET /me/profile": () => okJson(ownProfile()), "GET /me/profile/preview": () => okJson(preview(ownProfile())), "GET /me/skill-passport": () => okJson(passport) });
    for (const screen of ["", "?screen=passport", "?screen=privacy"]) {
      await page.goto(`${HARNESS}${screen}`);
      await hydrated(page);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});
