import { describe, expect, it, vi } from "vitest";
import { ApiClientError, createApiClient, errorMessageKey } from "./index";

const health = {
  status: "ok",
  service: "skillprove-api",
  apiVersion: "v1",
  timestamp: "2026-11-02T10:00:00.000Z",
};

function clientReturning(body: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  return { fetch, client: createApiClient({ baseUrl: "http://api.test/", fetch }) };
}

describe("createApiClient", () => {
  it("calls the versioned path and returns parsed data", async () => {
    const { client, fetch } = clientReturning({ success: true, data: health });

    await expect(client.getHealth()).resolves.toEqual(health);
    expect(fetch.mock.calls[0]).toEqual([
      "http://api.test/api/v1/health",
      { method: "GET", headers: { Accept: "application/json" } },
    ]);
  });

  it("sends the current token on authenticated calls only", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "7f0a4a5e-3f7a-4c58-9d9b-0d5b8f7a1c11",
              email: null,
              status: "ACTIVE",
              locale: "sq",
              hasCandidateProfile: false,
              isPlatformAdmin: false,
              companies: [],
            },
          }),
        ),
    );
    const client = createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => "abc" });

    await client.getCurrentUser();
    expect(fetch.mock.calls[0]).toEqual([
      "http://api.test/api/v1/me",
      { method: "GET", headers: { Accept: "application/json", Authorization: "Bearer abc" } },
    ]);
  });

  it("does not call the API when there is no session token", async () => {
    const fetch = vi.fn();
    const client = createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => null });

    await expect(client.getCurrentUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces API errors with their code and status", async () => {
    const { client } = clientReturning(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Database unavailable." } },
      503,
    );

    await expect(client.getReadiness()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });
  });

  it("reports a network failure as NETWORK_ERROR", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const client = createApiClient({ baseUrl: "http://api.test", fetch });

    await expect(client.getHealth()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it.each([
    ["a malformed body", { unexpected: true }, 200],
    ["success data with an error status", { success: true, data: health }, 500],
  ])("rejects %s as INVALID_RESPONSE", async (_name, body, status) => {
    const { client } = clientReturning(body, status);

    const error = await client.getHealth().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: "INVALID_RESPONSE", status });
  });

  it("rejects a non-JSON body as INVALID_RESPONSE", async () => {
    const fetch = vi.fn(async () => new Response("<html></html>", { status: 502 }));
    const client = createApiClient({ baseUrl: "http://api.test", fetch });

    await expect(client.getHealth()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});

describe("candidate endpoints", () => {
  const experience = {
    id: "6c0b7c5e-1a7a-4c6f-9d6e-3c1b2a4d5e6f",
    title: "Dev",
    companyName: "Co",
    employmentType: null,
    location: null,
    description: null,
    startDate: "2021-01-01",
    endDate: null,
    isCurrent: true,
    updatedAt: "2026-11-04T10:00:00.000Z",
  };

  function authedClient(body: unknown, status = 200) {
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    return { fetch, client: createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => "abc", locale: "en" }) };
  }

  it("sends JSON bodies with the method, token and language", async () => {
    const { client, fetch } = authedClient({ success: true, data: experience }, 201);
    await client.sections.experiences.update(experience.id, { title: "Dev", companyName: "Co", startDate: "2021-01-01", isCurrent: true, expectedUpdatedAt: experience.updatedAt });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://api.test/api/v1/me/profile/experiences/${experience.id}?locale=en`);
    expect(init.method).toBe("PUT");
    expect(init.headers).toMatchObject({ Authorization: "Bearer abc", "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toMatchObject({ title: "Dev", expectedUpdatedAt: experience.updatedAt });
  });

  it("encodes IDs so they cannot change the path", async () => {
    const { client, fetch } = authedClient({ success: true, data: { deleted: true } });
    await client.sections.languages.remove("../../me");
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("http://api.test/api/v1/me/profile/languages/..%2F..%2Fme?locale=en");
  });

  it("returns field errors from a rejected request", async () => {
    const { client } = authedClient(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid.", fields: { endDate: "endBeforeStart" } } },
      400,
    );
    const error = await client.sections.experiences.add({ title: "Dev", companyName: "Co", startDate: "2022-01-01", endDate: "2021-01-01" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: "BAD_REQUEST", status: 400, fields: { endDate: "endBeforeStart" } });
  });

  it("treats a missing profile as null, and other failures as errors", async () => {
    await expect(authedClient({ success: false, error: { code: "NOT_FOUND", message: "Not found." } }, 404).client.getOwnProfile()).resolves.toBeNull();
    await expect(authedClient({ success: false, error: { code: "FORBIDDEN", message: "No." } }, 403).client.getOwnProfile()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a passport response that does not match the contract", async () => {
    const { client } = authedClient({ success: true, data: { verified: [{ score: "high" }], inAssessment: [], selfReported: [] } });
    await expect(client.getSkillPassport()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});

describe("error message keys", () => {
  it("maps API failures to the same translation keys on web and mobile", async () => {
    const { errorMessageKey, validationMessageKey } = await import("./index");
    expect(errorMessageKey(new ApiClientError("CONFLICT", "x", 409))).toBe("errors.conflict");
    expect(errorMessageKey(new ApiClientError("CONFLICT", "x", 409, { languageCode: "duplicate" }))).toBe("validation.duplicate");
    expect(errorMessageKey(new ApiClientError("NETWORK_ERROR", "x"))).toBe("errors.network");
    expect(errorMessageKey(new ApiClientError("BAD_REQUEST", "x", 400, { x: "made-up" }))).toBe("errors.generic");
    expect(errorMessageKey(new Error("boom"))).toBe("errors.generic");
    expect(validationMessageKey("endBeforeStart")).toBe("validation.endBeforeStart");
    expect(validationMessageKey("<script>")).toBeUndefined();
  });
});

describe("assessment calls", () => {
  const job = {
    id: "7f0a4a5e-3f7a-4c58-9d9b-0d5b8f7a1c11",
    status: "QUEUED",
    assessmentId: null,
    retryCount: 0,
    errorCode: null,
    inputTokens: null,
    outputTokens: null,
    createdAt: "2026-11-05T10:00:00.000Z",
    startedAt: null,
    finishedAt: null,
  };
  const request = {
    title: null,
    description: null,
    skills: [{ skillId: "11111111-1111-4111-8111-111111111111", expectedLevel: "BEGINNER" as const }],
    difficulty: "BEGINNER" as const,
    assessmentType: "KNOWLEDGE" as const,
    questionCount: 5,
    durationMinutes: 20,
    language: "en" as const,
    additionalInstructions: null,
  };

  it("starts generation with an idempotency key and parses the job", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: { job, reused: false } }), { status: 202 }));
    const client = createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => "tok" });
    const result = await client.startGeneration("22222222-2222-4222-8222-222222222222", request, "key-12345678");
    expect(result.job.status).toBe("QUEUED");
    const init = fetch.mock.calls[0]?.[1] as unknown as { headers: Record<string, string>; method: string };
    expect(init.method).toBe("POST");
    expect(init.headers["Idempotency-Key"]).toBe("key-12345678");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("rejects a response that does not match the schema instead of passing it on", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { job: { ...job, status: "WHATEVER" }, reused: false } }), { status: 202 }));
    const client = createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => "tok" });
    await expect(client.startGeneration("22222222-2222-4222-8222-222222222222", request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps limit and availability failures to translation keys", async () => {
    const { errorMessageKey } = await import("./index");
    expect(errorMessageKey(new ApiClientError("RATE_LIMITED", "x", 429))).toBe("errors.rateLimited");
    expect(errorMessageKey(new ApiClientError("SERVICE_UNAVAILABLE", "x", 503))).toBe("errors.aiUnavailable");
  });
});

describe("attempt calls", () => {
  const attemptId = "33333333-3333-4333-8333-333333333333";
  const questionId = "44444444-4444-4444-8444-444444444444";
  const attempt = {
    id: attemptId,
    assessmentId: "55555555-5555-4555-8555-555555555555",
    title: "JavaScript basics",
    instructions: null,
    language: "en",
    difficulty: "BEGINNER",
    status: "SUBMITTED",
    attemptNumber: 1,
    maxAttempts: 2,
    startedAt: "2026-11-26T10:00:00.000Z",
    expiresAt: "2026-11-26T10:20:00.000Z",
    submittedAt: "2026-11-26T10:10:00.000Z",
    questions: [],
  };
  const client = (data: unknown, status = 200) => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data }), { status }));
    return { fetch, client: createApiClient({ baseUrl: "http://api.test", fetch, getToken: async () => "tok" }) };
  };
  const call = (fetch: ReturnType<typeof client>["fetch"]) => {
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { method: string; body?: string; headers: Record<string, string> }];
    return { url: url.split("?")[0], method: init.method, body: init.body ? (JSON.parse(init.body) as unknown) : undefined, auth: init.headers.Authorization };
  };

  it("submits answers under an `answers` key, with the session token", async () => {
    const { fetch, client: api } = client(attempt);
    await api.submitAttempt(attemptId, { [questionId]: "B" });
    expect(call(fetch)).toEqual({
      url: `http://api.test/api/v1/me/attempts/${attemptId}/submit`,
      method: "POST",
      body: { answers: { [questionId]: "B" } },
      auth: "Bearer tok",
    });
  });

  it("uses the documented paths for listing, starting, reading and results", async () => {
    const list = client({ items: [] });
    await list.client.listTakeableAssessments();
    expect(call(list.fetch)).toMatchObject({ url: "http://api.test/api/v1/me/assessments", method: "GET" });

    const start = client({ ...attempt, status: "IN_PROGRESS", submittedAt: null }, 201);
    expect((await start.client.startAttempt("../x")).status).toBe("IN_PROGRESS");
    expect(call(start.fetch)).toMatchObject({ url: "http://api.test/api/v1/me/assessments/..%2Fx/attempts", method: "POST" });

    const read = client(attempt);
    await read.client.getAttempt(attemptId);
    expect(call(read.fetch)).toMatchObject({ url: `http://api.test/api/v1/me/attempts/${attemptId}`, method: "GET" });
  });

  it("parses each result state, and refuses a result shape outside the contract", async () => {
    const base = { attemptId, submittedAt: attempt.submittedAt, questionCount: 3 };
    const pending = client({ ...base, state: "pending", scoredAt: null, percent: null, skills: [] });
    expect((await pending.client.getAttemptResult(attemptId)).state).toBe("pending");
    expect(call(pending.fetch).url).toBe(`http://api.test/api/v1/me/attempts/${attemptId}/result`);

    const failed = client({ ...base, state: "failed", scoredAt: null, percent: null, skills: [] });
    expect((await failed.client.getAttemptResult(attemptId)).state).toBe("failed");

    const leaky = client({ ...base, state: "scored", scoredAt: attempt.submittedAt, percent: 150, skills: [] });
    await expect(leaky.client.getAttemptResult(attemptId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps attempt failures to translation keys", () => {
    expect(errorMessageKey(new ApiClientError("PROFILE_REQUIRED", "x", 409))).toBe("errors.profileRequired");
    expect(errorMessageKey(new ApiClientError("ATTEMPTS_EXHAUSTED", "x", 409))).toBe("errors.attemptsExhausted");
    expect(errorMessageKey(new ApiClientError("ATTEMPT_EXPIRED", "x", 409))).toBe("errors.attemptExpired");
  });
});
