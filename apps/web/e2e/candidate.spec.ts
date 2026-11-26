import { expect, test, type Page, type Route } from "@playwright/test";
import { verifiedSkillLevel } from "@skillprove/shared";
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
  for (const path of ["/profile", "/skill-passport", "/profile/privacy", "/take"]) {
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
    // Score 72 at confidence 64 is high enough to name a level.
    await expect(verified.getByText(t("passport.verifiedLevel"))).toBeVisible();
    await expect(verified.getByText(t("passport.levels.ADVANCED"))).toBeVisible();
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

test.describe("assessments to take", () => {
  const choices = [
    { id: "A", text: "3" },
    { id: "B", text: "4" },
    { id: "C", text: "5" },
  ];
  const result = (attemptId: string, overrides: Record<string, unknown>) => ({
    attemptId,
    state: "scored",
    submittedAt: NOW,
    scoredAt: NOW,
    questionCount: 3,
    percent: 67,
    skills: [
      { skillId: "11111111-1111-4111-8111-111111111111", name: "SQL", questionCount: 2, answeredCount: 2, percent: 100 },
      { skillId: "99999999-9999-4999-8999-999999999999", name: "JavaScript", questionCount: 1, answeredCount: 0, percent: 0 },
    ],
    ...overrides,
  });
  const attempt = (overrides: Record<string, unknown>) => ({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    assessmentId: "66666666-6666-4666-8666-666666666666",
    title: "JavaScript basics",
    instructions: null,
    language: "sq",
    difficulty: "BEGINNER",
    status: "IN_PROGRESS",
    attemptNumber: 1,
    maxAttempts: 3,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    submittedAt: null,
    questions: [
      { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1", position: 1, kind: "multiple_choice", prompt: "Cili është rezultati i 2 + 2?", choices },
      { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2", position: 2, kind: "true_false", prompt: "JavaScript është i njëjtë me Java." },
      { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3", position: 3, kind: "multiple_select", prompt: "Cilat janë numra çift?", choices },
    ],
    ...overrides,
  });
  const item = (overrides: Record<string, unknown>) => ({
    assessmentId: "66666666-6666-4666-8666-666666666666",
    versionId: "77777777-7777-4777-8777-777777777777",
    title: "JavaScript basics",
    description: "Variables, types, arrays and functions.",
    language: "en",
    difficulty: "BEGINNER",
    durationMinutes: 10,
    questionCount: 5,
    skills: [{ skillId: "11111111-1111-4111-8111-111111111111", name: "JavaScript" }],
    maxAttempts: 3,
    attemptsUsed: 0,
    openAttemptId: null,
    ...overrides,
  });

  test("lists each assessment with its details and whether it can be taken", async ({ page }) => {
    await mockApi(page, {
      "GET /me/assessments": () =>
        okJson({
          items: [
            item({}),
            item({ assessmentId: "88888888-8888-4888-8888-888888888888", title: "Pyetje SQL", attemptsUsed: 1, openAttemptId: "99999999-9999-4999-8999-999999999999" }),
            item({ assessmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "React", durationMinutes: null, attemptsUsed: 2, maxAttempts: 2 }),
          ],
        }),
    });
    await page.goto(`${HARNESS}?screen=take`);
    await hydrated(page);

    const card = (title: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: title }) });
    await expect(card("JavaScript basics").getByText(t("passport.difficulty.BEGINNER"))).toBeVisible();
    await expect(card("JavaScript basics").getByText("JavaScript", { exact: true })).toBeVisible();
    await expect(card("JavaScript basics").getByText(t("take.attempts", { used: 0, max: 3 }), { exact: false })).toBeVisible();
    await expect(card("Pyetje SQL").getByText(t("take.inProgress"))).toBeVisible();
    await expect(card("React").getByText(t("take.noAttemptsLeft"))).toBeVisible();
    await expect(card("React").getByText(t("take.noTimeLimit"), { exact: false })).toBeVisible();
    // An open attempt continues, a used-up assessment offers nothing.
    await expect(card("Pyetje SQL").getByRole("button", { name: new RegExp(t("take.continue")) })).toBeVisible();
    await expect(card("React").getByRole("button")).toHaveCount(0);
  });

  test("asks before starting, then starts the attempt", async ({ page }) => {
    const attemptId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const requests = await mockApi(page, {
      "GET /me/assessments": () => okJson({ items: [item({})] }),
      "POST /me/assessments/66666666-6666-4666-8666-666666666666/attempts": () => ({ status: 201, json: { success: true, data: attempt({ id: attemptId }) } }),
    });
    await page.goto(`${HARNESS}?screen=take`);
    await hydrated(page);
    await page.getByRole("button", { name: `${t("take.start")}: JavaScript basics` }).click();

    const dialog = page.getByRole("dialog", { name: t("take.confirmTitle") });
    await expect(dialog.getByText(t("take.confirmBody", { max: 3 }))).toBeVisible();
    await expect(dialog.getByText(t("take.confirmDuration", { minutes: 10 }))).toBeVisible();
    await expect(dialog.getByText(t("take.confirmKeepsRunning"))).toBeVisible();
    // Cancelling starts nothing.
    await dialog.getByRole("button", { name: t("common.cancel") }).click();
    expect(requests.some((r) => r.method === "POST")).toBe(false);

    await page.getByRole("button", { name: `${t("take.start")}: JavaScript basics` }).click();
    // The attempt page needs a real session, so only the navigation to it is checked.
    const opened = page.waitForRequest((request) => new URL(request.url()).pathname === `/take/${attemptId}`);
    await dialog.getByRole("button", { name: t("take.start"), exact: true }).click();
    await opened;
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
  });

  test("takes an attempt one question at a time and submits with a warning", async ({ page }) => {
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const requests = await mockApi(page, {
      [`GET /me/attempts/${id}`]: () => okJson(attempt({ id })),
      [`POST /me/attempts/${id}/submit`]: () => okJson(attempt({ id, status: "SUBMITTED", submittedAt: new Date().toISOString() })),
      [`GET /me/attempts/${id}/result`]: () => okJson(result(id, { state: "pending", scoredAt: null, percent: null, skills: [] })),
    });
    await page.goto(`${HARNESS}?screen=attempt&id=${id}`);
    await hydrated(page);

    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cili është rezultati i 2 + 2?" })).toBeVisible();
    await page.getByLabel("4", { exact: true }).check();
    await page.getByRole("button", { name: t("take.next") }).click();
    await page.getByLabel(t("take.answerFalse")).check();
    await page.getByRole("button", { name: t("take.next") }).click();
    // Answers survive a reload: they are kept in the browser until submit.
    await page.reload();
    await hydrated(page);
    await page.getByRole("button", { name: t("take.next") }).click();
    await expect(page.getByLabel(t("take.answerFalse"))).toBeChecked();
    await page.getByRole("button", { name: t("take.next") }).click();
    await page.getByRole("button", { name: t("take.review") }).click();

    const rows = page.getByRole("main").getByRole("listitem");
    await expect(rows.nth(0).getByText(t("take.answered"))).toBeVisible();
    await expect(rows.nth(2).getByText(t("take.notAnswered"))).toBeVisible();
    await page.getByRole("button", { name: t("take.submit") }).click();
    const dialog = page.getByRole("dialog", { name: t("take.submitConfirmTitle") });
    await expect(dialog.getByText(t("take.submitUnanswered", { count: 1 }))).toBeVisible();
    await dialog.getByRole("button", { name: t("take.submit") }).click();

    await expect(page.getByText(t("take.calculating"))).toBeVisible();
    const submit = requests.find((r) => r.method === "POST");
    expect(submit?.body).toEqual({ answers: { "dddddddd-dddd-4ddd-8ddd-ddddddddddd1": "B", "dddddddd-dddd-4ddd-8ddd-ddddddddddd2": false } });
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sp-attempt-answers.")))).toEqual([]);
  });

  test("submits by itself when the time is up", async ({ page }) => {
    const id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const requests = await mockApi(page, {
      [`GET /me/attempts/${id}`]: () => okJson(attempt({ id, expiresAt: new Date(Date.now() + 2000).toISOString() })),
      [`POST /me/attempts/${id}/submit`]: () => okJson(attempt({ id, status: "SUBMITTED", submittedAt: new Date().toISOString() })),
      [`GET /me/attempts/${id}/result`]: () => okJson(result(id, { state: "pending", scoredAt: null, percent: null, skills: [] })),
    });
    await page.goto(`${HARNESS}?screen=attempt&id=${id}`);
    await hydrated(page);
    await expect(page.getByText(t("take.calculating"))).toBeVisible({ timeout: 10_000 });
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
  });

  test("shows the result once scored: overall, per skill and Passport level, never which answers were right", async ({ page }) => {
    const id = "f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0";
    let polls = 0;
    await mockApi(page, {
      [`GET /me/attempts/${id}`]: () => okJson(attempt({ id, status: "SUBMITTED", submittedAt: NOW })),
      // Pending first, then scored: the screen polls.
      [`GET /me/attempts/${id}/result`]: () => okJson(polls++ === 0 ? result(id, { state: "pending", scoredAt: null, percent: null, skills: [] }) : result(id, {})),
      "GET /me/skill-passport": () => okJson(passport),
    });
    await page.goto(`${HARNESS}?screen=attempt&id=${id}`);
    await hydrated(page);
    await expect(page.getByText(t("take.calculating"))).toBeVisible();

    await expect(page.getByText(t("take.overall"))).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("67%")).toBeVisible();
    const sql = page.getByRole("main").getByRole("listitem").filter({ has: page.getByRole("heading", { name: "SQL" }) });
    await expect(sql.getByText("100%")).toBeVisible();
    const level = verifiedSkillLevel(72, 64);
    await expect(sql.getByText(level ? t(`passport.levels.${level}`) : t("passport.moreAssessmentsNeeded"))).toBeVisible();
    // A skill with no verified score shows no level row.
    const js = page.getByRole("main").getByRole("listitem").filter({ has: page.getByRole("heading", { name: "JavaScript" }) });
    await expect(js.getByText(t("take.passportLevel"))).toHaveCount(0);
    // Questions and choices are not repeated here.
    await expect(page.getByText("Cili është rezultati i 2 + 2?")).toHaveCount(0);
    await expect(page.getByRole("link", { name: t("take.openPassport") })).toHaveAttribute("href", "/skill-passport");
  });

  test("says when a result could not be calculated", async ({ page }) => {
    const id = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";
    await mockApi(page, {
      [`GET /me/attempts/${id}`]: () => okJson(attempt({ id, status: "SUBMITTED", submittedAt: NOW })),
      [`GET /me/attempts/${id}/result`]: () => okJson(result(id, { state: "failed", scoredAt: null, percent: null, skills: [] })),
    });
    await page.goto(`${HARNESS}?screen=attempt&id=${id}`);
    await hydrated(page);
    await expect(page.getByText(t("take.failedTitle"))).toBeVisible();
    await expect(page.getByText(t("take.failedBody"))).toBeVisible();
  });

  test("says so when there is nothing to take", async ({ page }) => {
    await mockApi(page, { "GET /me/assessments": () => okJson({ items: [] }) });
    await page.goto(`${HARNESS}?screen=take`);
    await hydrated(page);
    await expect(page.getByText(t("take.empty"))).toBeVisible();
  });
});
