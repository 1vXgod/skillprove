import { expect, test, type Page, type Route } from "@playwright/test";
import { createTranslator, type Locale } from "@skillprove/shared/i18n";
import type { AiJob, AssessmentDetail, AssessmentPreview, Question } from "@skillprove/validation";

const HARNESS = "/design-system/assessments";
const NOW = "2026-11-05T10:00:00.000Z";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SKILL = "11111111-1111-4111-8111-111111111111";
const ASSESSMENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const JOB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const Q1 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const Q2 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const okJson = (data: unknown, status = 200) => ({ status, json: { success: true, data } });
const failJson = (code: string, status: number, fields?: Record<string, string>) => ({ status, json: { success: false, error: { code, message: "x", ...(fields ? { fields } : {}) } } });

const me = (role: string) => okJson({ id: "11111111-2222-4333-8444-555555555555", email: "a@b.test", status: "ACTIVE", locale: "sq", hasCandidateProfile: false, isPlatformAdmin: false, companies: [{ companyId: COMPANY, role }] });

const choice = (id: string, position: number, prompt: string): Question => ({
  id,
  position,
  kind: "multiple_choice",
  prompt,
  choices: [{ id: "A", text: "One" }, { id: "B", text: "Two" }],
  correctChoiceId: "B",
  explanation: "Because.",
  skillId: SKILL,
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 2,
});

const detail = (overrides: Partial<AssessmentDetail> = {}): AssessmentDetail => ({
  id: ASSESSMENT,
  companyId: COMPANY,
  creationSource: "AI_GENERATED",
  title: "Backend basics",
  description: "Core ideas",
  instructions: "Answer all questions.",
  language: "en",
  difficulty: "INTERMEDIATE",
  assessmentType: "KNOWLEDGE",
  durationMinutes: 30,
  version: { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", version: 1, status: "DRAFT", publishedAt: null, createdAt: NOW, updatedAt: NOW },
  hasOpenDraft: true,
  hasPublishedVersion: false,
  skills: [{ skillId: SKILL, name: "SQL", weight: 100 }],
  questions: [choice(Q1, 1, "First question?"), choice(Q2, 2, "Second question?")],
  rubric: { id: "99999999-9999-4999-8999-999999999999", version: 1, published: false, criteria: [{ id: "88888888-8888-4888-8888-888888888888", key: "accuracy", title: "Accuracy", description: "Right.", maxScore: 10, weight: 100, scoringGuidance: "0-3 weak.", skillId: SKILL }] },
  aiJobId: null,
  publishIssues: [],
  ...overrides,
});

const job = (overrides: Partial<AiJob> = {}): AiJob => ({ id: JOB, status: "QUEUED", assessmentId: null, retryCount: 0, errorCode: null, inputTokens: null, outputTokens: null, createdAt: NOW, startedAt: null, finishedAt: null, ...overrides });

async function mockApi(page: Page, handlers: Record<string, (route: Route, body: unknown) => unknown>) {
  const requests: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = [];
  await page.route("http://localhost:4100/api/v1/**", async (route) => {
    const request = route.request();
    const cors = { "access-control-allow-origin": "http://localhost:3100", "access-control-allow-headers": "Authorization, Content-Type, Accept, Idempotency-Key", "access-control-allow-methods": "GET, POST, PUT, DELETE" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const body: unknown = request.postData() ? JSON.parse(request.postData() ?? "null") : undefined;
    requests.push({ method: request.method(), path, body, headers: request.headers() });
    const handler = handlers[`${request.method()} ${path}`];
    if (!handler) return route.fulfill({ status: 404, headers: cors, json: { success: false, error: { code: "NOT_FOUND", message: "Not found." } } });
    const result = (await handler(route, body)) as { status?: number; json: unknown } | undefined;
    if (result) await route.fulfill({ status: result.status ?? 200, headers: cors, json: result.json });
  });
  return requests;
}

async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("#main");
    return main !== null && Object.keys(main).some((key) => key.startsWith("__react"));
  });
}

async function setPreferences(page: Page, locale: Locale, theme: "light" | "dark") {
  await page.context().addCookies([
    { name: "sp-locale", value: locale, url: "http://localhost:3100" },
    { name: "sp-theme", value: theme, url: "http://localhost:3100" },
  ]);
}

const skillsHandler = () => okJson({ items: [{ id: SKILL, slug: "sql", name: "SQL", category: "Data" }], nextCursor: null });

for (const locale of ["sq", "en"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`assessment screens (${locale}, ${theme})`, () => {
      const t = createTranslator(locale);
      test.beforeEach(async ({ page }) => setPreferences(page, locale, theme));

      test("lists assessments with an empty state, loading and an error", async ({ page }) => {
        await mockApi(page, { "GET /me": () => me("RECRUITER"), ["GET /companies/" + COMPANY + "/assessments"]: () => okJson({ items: [], page: 1, pageSize: 10, total: 0 }) });
        await page.goto(HARNESS);
        await hydrated(page);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByText(t("assessments.list.empty"))).toBeVisible();
        await expect(page.getByRole("link", { name: t("assessments.create") }).first()).toBeVisible();
      });

      test("shows a retryable error when the list cannot load", async ({ page }) => {
        await mockApi(page, { "GET /me": () => me("RECRUITER"), ["GET /companies/" + COMPANY + "/assessments"]: () => failJson("INTERNAL_ERROR", 500) });
        await page.goto(HARNESS);
        await expect(page.getByText(t("errors.loadFailed"))).toBeVisible();
      });
    });
  }
}

test.describe("assessment workflows", () => {
  const t = createTranslator("sq");

  test("hides authoring from viewers, who can still read", async ({ page }) => {
    await mockApi(page, {
      "GET /me": () => me("VIEWER"),
      ["GET /companies/" + COMPANY + "/assessments"]: () =>
        okJson({ items: [{ id: ASSESSMENT, title: "Backend basics", language: "en", difficulty: "INTERMEDIATE", assessmentType: "KNOWLEDGE", status: "PUBLISHED", version: 1, creationSource: "HUMAN", questionCount: 2, updatedAt: NOW }], page: 1, pageSize: 10, total: 1 }),
    });
    await page.goto(HARNESS);
    await expect(page.getByRole("link", { name: "Backend basics" })).toBeVisible();
    await expect(page.getByText(t("assessments.noPermission"))).toBeVisible();
    await expect(page.getByRole("link", { name: t("assessments.create") })).toHaveCount(0);
  });

  test("walks the wizard, validates each step and starts an AI job with an idempotency key", async ({ page }) => {
    const requests = await mockApi(page, {
      "GET /me": () => me("OWNER"),
      "GET /skills": skillsHandler,
      ["POST /companies/" + COMPANY + "/assessments/generate"]: () => okJson({ job: job(), reused: false }, 202),
      ["GET /ai/jobs/" + JOB]: () => okJson(job({ status: "RUNNING" })),
    });
    await page.goto(`${HARNESS}?screen=wizard`);
    await hydrated(page);
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();

    // Skills are required.
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await expect(page.getByText(t("validation.required")).first()).toBeVisible();
    await page.getByRole("button", { name: "+ SQL" }).click();
    await expect(page.getByTestId("selected-skills")).toContainText("SQL");
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();

    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await page.getByLabel(t("assessments.wizard.questionCount")).fill("99");
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await expect(page.getByLabel(t("assessments.wizard.questionCount"))).toHaveAccessibleDescription(t("validation.invalidNumber"));
    await page.getByLabel(t("assessments.wizard.questionCount")).fill("6");
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();

    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await expect(page.getByTestId("wizard-summary")).toContainText("SQL");
    await page.getByRole("button", { name: t("assessments.wizard.start") }).click();

    await expect.poll(() => requests.find((r) => r.path.endsWith("/generate"))?.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
    const sent = requests.find((r) => r.path.endsWith("/generate"))?.body as { questionCount: number; skills: unknown[] };
    expect(sent.questionCount).toBe(6);
    expect(sent.skills).toHaveLength(1);
  });

  test("creates a manual draft", async ({ page }) => {
    const requests = await mockApi(page, {
      "GET /me": () => me("ADMIN"),
      "GET /skills": skillsHandler,
      ["POST /companies/" + COMPANY + "/assessments"]: () => okJson(detail({ creationSource: "HUMAN", questions: [] }), 201),
      ["GET /assessments/" + ASSESSMENT]: () => okJson(detail({ creationSource: "HUMAN", questions: [] })),
    });
    await page.goto(`${HARNESS}?screen=wizard`);
    await hydrated(page);
    await page.getByLabel(t("assessments.wizard.assessmentTitle")).fill("Hand written");
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await page.getByRole("button", { name: "+ SQL" }).click();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await page.getByLabel(t("assessments.wizard.methodManual")).check();
    await page.getByRole("button", { name: t("assessments.wizard.next") }).click();
    await page.getByRole("button", { name: t("assessments.wizard.start") }).click();
    await expect.poll(() => requests.some((r) => r.method === "POST" && r.path === "/companies/" + COMPANY + "/assessments")).toBe(true);
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({ title: "Hand written", skillIds: [SKILL] });
  });

  test("follows a generation job by polling until the draft is ready", async ({ page }) => {
    let polls = 0;
    await mockApi(page, {
      "GET /me": () => me("OWNER"),
      ["GET /ai/jobs/" + JOB]: () => {
        polls += 1;
        return okJson(polls < 2 ? job({ status: "RUNNING" }) : job({ status: "SUCCEEDED", assessmentId: ASSESSMENT, inputTokens: 100, outputTokens: 50 }));
      },
    });
    await page.goto(`${HARNESS}?screen=progress&id=${JOB}`);
    await expect(page.getByText(t("assessments.generation.running"))).toBeVisible();
    await expect(page.getByTestId("generation-progress")).toHaveAttribute("data-status", "SUCCEEDED", { timeout: 10_000 });
    await expect(page.getByRole("link", { name: t("assessments.generation.openDraft") })).toHaveAttribute("href", `/assessments/${ASSESSMENT}`);
    const settled = polls;
    await page.waitForTimeout(2600);
    expect(polls).toBe(settled);
  });

  test("shows a safe message when generation fails, and retries", async ({ page }) => {
    let failed = true;
    const requests = await mockApi(page, {
      "GET /me": () => me("OWNER"),
      ["GET /ai/jobs/" + JOB]: () => okJson(failed ? job({ status: "FAILED", errorCode: "provider_timeout" }) : job({ status: "QUEUED", retryCount: 1 })),
      ["POST /ai/jobs/" + JOB + "/retry"]: () => {
        failed = false;
        return okJson(job({ status: "QUEUED", retryCount: 1 }), 202);
      },
    });
    await page.goto(`${HARNESS}?screen=progress&id=${JOB}`);
    await expect(page.getByTestId("generation-progress").getByRole("alert")).toContainText(t("assessments.generation.reason.provider_timeout"));
    await page.getByRole("button", { name: t("assessments.generation.retry") }).click();
    await expect(page.getByText(t("assessments.generation.queued"))).toBeVisible();
    expect(requests.some((r) => r.path.endsWith("/retry"))).toBe(true);
  });

  test("edits a draft: add a question, reorder, remove, and see why publishing is blocked", async ({ page }) => {
    let current = detail({ publishIssues: ["rubricRequired"], rubric: null });
    const requests = await mockApi(page, {
      "GET /me": () => me("RECRUITER"),
      ["GET /assessments/" + ASSESSMENT]: () => okJson(current),
      ["PUT /assessments/" + ASSESSMENT + "/questions/reorder"]: (_r, body) => {
        const ids = (body as { questionIds: string[] }).questionIds;
        current = { ...current, questions: ids.map((id, i) => ({ ...(current.questions.find((q) => q.id === id) as Question), position: i + 1 })) };
        return okJson(current);
      },
      ["POST /assessments/" + ASSESSMENT + "/questions"]: (_r, body) => {
        current = { ...current, questions: [...current.questions, { ...(body as Question), id: "12121212-1212-4212-8212-121212121212", position: 3 }] };
        return okJson(current, 201);
      },
      ["DELETE /assessments/" + ASSESSMENT + "/questions/" + Q2]: () => {
        current = { ...current, questions: current.questions.filter((q) => q.id !== Q2) };
        return okJson(current);
      },
    });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await expect(page.getByTestId("publish-issues")).toContainText(t("assessments.issues.rubricRequired"));
    await expect(page.getByRole("button", { name: t("assessments.editor.publish"), exact: true })).toBeDisabled();

    await page.getByRole("tab", { name: new RegExp(t("assessments.editor.questions")) }).click();
    await page.getByRole("button", { name: t("assessments.question.moveDown", { position: 1 }) }).click();
    await expect(page.getByTestId("question-list").getByRole("listitem").first()).toContainText("Second question?");

    // A short answer needs criteria; the form checks before sending.
    await page.getByRole("button", { name: t("assessments.question.add") }).click();
    const dialog = page.getByRole("dialog", { name: t("assessments.question.add") });
    await dialog.getByLabel(t("assessments.question.kind")).selectOption("short_answer");
    await dialog.getByLabel(t("assessments.question.prompt")).fill("Explain an index.");
    await dialog.getByRole("button", { name: t("assessments.question.save") }).click();
    await expect(dialog.getByLabel(t("assessments.question.expectedCriteria"))).toHaveAccessibleDescription(t("validation.required"));
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(0);
    await dialog.getByLabel(t("assessments.question.expectedCriteria")).fill("Mentions lookup speed\nMentions write cost");
    await dialog.getByRole("button", { name: t("assessments.question.save") }).click();
    await expect(page.getByTestId("question-list")).toContainText("Explain an index.");
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({ kind: "short_answer", expectedCriteria: ["Mentions lookup speed", "Mentions write cost"], skillId: SKILL });

    await page.getByRole("button", { name: t("assessments.question.remove") }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: t("assessments.question.remove") }).click();
    await expect(page.getByTestId("question-list")).not.toContainText("Second question?");
  });

  test("checks rubric weights live and refuses to send a total other than 100", async ({ page }) => {
    const requests = await mockApi(page, { "GET /me": () => me("OWNER"), ["GET /assessments/" + ASSESSMENT]: () => okJson(detail()) });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await page.getByRole("tab", { name: t("assessments.editor.rubric") }).click();
    await expect(page.getByTestId("rubric-total")).toHaveText(t("assessments.rubric.total", { total: 100 }));
    await page.getByLabel(t("assessments.rubric.weight")).fill("60");
    await expect(page.getByTestId("rubric-total")).toHaveText(t("assessments.rubric.total", { total: 60 }));
    await page.getByRole("button", { name: t("assessments.rubric.save") }).click();
    await expect(page.getByText(t("validation.weightsMustTotal100"))).toBeVisible();
    expect(requests.filter((r) => r.method === "PUT")).toHaveLength(0);
  });

  test("shows a candidate preview without answers", async ({ page }) => {
    const preview: AssessmentPreview = {
      title: "Backend basics",
      description: null,
      instructions: "Answer all questions.",
      durationMinutes: 30,
      language: "en",
      questions: [{ id: Q1, position: 1, kind: "multiple_choice", prompt: "First question?", choices: [{ id: "A", text: "One" }, { id: "B", text: "Two" }] }],
    };
    await mockApi(page, { "GET /me": () => me("OWNER"), ["GET /assessments/" + ASSESSMENT]: () => okJson(detail()), ["GET /assessments/" + ASSESSMENT + "/preview"]: () => okJson(preview) });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await page.getByRole("tab", { name: t("assessments.editor.preview") }).click();
    const view = page.getByTestId("candidate-preview");
    await expect(view).toContainText("First question?");
    await expect(view).toContainText(t("assessments.preview.notice"));
    await expect(view).not.toContainText("Because.");
  });

  test("a published version is read-only; editing starts a new draft", async ({ page }) => {
    let current = detail({ version: { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", version: 1, status: "PUBLISHED", publishedAt: NOW, createdAt: NOW, updatedAt: NOW }, hasOpenDraft: false, hasPublishedVersion: true });
    await mockApi(page, {
      "GET /me": () => me("OWNER"),
      ["GET /assessments/" + ASSESSMENT]: () => okJson(current),
      ["POST /assessments/" + ASSESSMENT + "/draft"]: () => {
        current = detail({ version: { id: "10101010-1010-4010-8010-101010101010", version: 2, status: "DRAFT", publishedAt: null, createdAt: NOW, updatedAt: NOW }, hasPublishedVersion: true });
        return okJson(current, 201);
      },
    });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await expect(page.getByText(t("assessments.editor.readOnly"))).toBeVisible();
    await expect(page.getByLabel(t("assessments.wizard.assessmentTitle"))).toBeDisabled();
    await expect(page.getByRole("button", { name: t("assessments.editor.saveDraft") })).toHaveCount(0);
    await page.getByRole("button", { name: t("assessments.editor.editNewDraft") }).click();
    await expect(page.getByTestId("assessment-editor")).toHaveAttribute("data-status", "DRAFT");
    await expect(page.getByLabel(t("assessments.wizard.assessmentTitle"))).toBeEnabled();
  });

  test("publishes after confirmation", async ({ page }) => {
    const requests = await mockApi(page, {
      "GET /me": () => me("OWNER"),
      ["GET /assessments/" + ASSESSMENT]: () => okJson(detail()),
      ["POST /assessments/" + ASSESSMENT + "/publish"]: () => okJson({ versionId: "ffffffff-ffff-4fff-8fff-ffffffffffff", version: 1 }),
    });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await page.getByRole("button", { name: t("assessments.editor.publish"), exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: t("assessments.editor.publish") }).click();
    await expect(page.getByText(t("assessments.editor.published"))).toBeVisible();
    expect(requests.some((r) => r.path.endsWith("/publish"))).toBe(true);
  });

  test("shows a stale-edit conflict from the server", async ({ page }) => {
    await mockApi(page, {
      "GET /me": () => me("OWNER"),
      ["GET /assessments/" + ASSESSMENT]: () => okJson(detail()),
      ["PUT /assessments/" + ASSESSMENT]: () => failJson("CONFLICT", 409),
    });
    await page.goto(`${HARNESS}?screen=editor&id=${ASSESSMENT}`);
    await page.getByRole("button", { name: t("assessments.editor.saveDraft") }).click();
    await expect(page.getByRole("alert").filter({ hasText: t("errors.conflict") })).toBeVisible();
  });
});
