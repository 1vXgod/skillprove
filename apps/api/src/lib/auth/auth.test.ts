import { createHmac, createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getMe } from "../../app/api/v1/me/route";
import { POST as postWebhook } from "../../app/api/v1/webhooks/clerk/route";
import { proxy } from "../../proxy";
import { getClerk, resetClerkForTests } from "./clerk";
import {
  requireCandidateAccess,
  requireCompanyMembership,
  requireCompanyRole,
  requirePlatformAdmin,
  type AuthenticatedUser,
} from "./guards";
import { toVerifiedEmail } from "./identity-sync";

// The database is mocked here and tested for real in packages/database. Clerk's token and
// webhook verification are not mocked: the tests sign real tokens with a throwaway key.
const database = vi.hoisted(() => ({
  findUserByAuthSubject: vi.fn(),
  findActiveCompanyMembership: vi.fn(),
  findActivePlatformAdmin: vi.fn(),
  loadUserAccess: vi.fn(),
  syncIdentity: vi.fn(),
  anonymizeIdentity: vi.fn(),
  companyScope: vi.fn((_db: unknown, companyId: string) => ({ companyId })),
}));
vi.mock("@skillprove/database", () => database);
vi.mock("../db", () => ({ getDb: () => ({}) }));

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const WEBHOOK_KEY = randomBytes(24);
const ISSUER = "https://test-instance.clerk.accounts.dev";
const WEB_ORIGIN = "http://localhost:3000";
const CLERK_ID = "user_test123";
const COMPANY_ID = "7f0a4a5e-3f7a-4c58-9d9b-0d5b8f7a1c11";

const activeUser = {
  id: "2a1f2c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b",
  authSubject: CLERK_ID,
  email: "person@test.invalid",
  status: "ACTIVE",
  locale: "sq",
} as AuthenticatedUser;

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(claims: Record<string, unknown> = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    iss: ISSUER,
    sub: CLERK_ID,
    sid: "sess_test",
    iat: now - 5,
    nbf: now - 5,
    exp: now + 60,
    ...claims,
  };
  const unsigned = `${encode({ alg: "RS256", typ: "JWT", kid: "test-key" })}.${encode(body)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  return `${unsigned}.${signature}`;
}

function meRequest(token?: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:4000/api/v1/me", {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
}

const callMe = (request: Request) => getMe(request, undefined as never);

function webhookRequest(payload: unknown, options: { timestamp?: number; key?: Buffer } = {}) {
  const body = JSON.stringify(payload);
  const id = "msg_test";
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", options.key ?? WEBHOOK_KEY)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("http://localhost:4000/api/v1/webhooks/clerk", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(timestamp),
      "svix-signature": `v1,${signature}`,
    },
  });
}

function clerkUser(status = "verified") {
  return {
    id: CLERK_ID,
    primaryEmailAddressId: "idn_1",
    emailAddresses: [
      { id: "idn_0", emailAddress: "other@test.invalid", verification: { status: "verified" } },
      { id: "idn_1", emailAddress: "person@test.invalid", verification: { status } },
    ],
  };
}

const savedEnv = { ...process.env };

beforeAll(() => {
  process.env.CLERK_SECRET_KEY = "test-only-not-a-real-secret";
  process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("test-instance.clerk.accounts.dev$").toString("base64")}`;
  process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = `whsec_${WEBHOOK_KEY.toString("base64")}`;
  process.env.CORS_ALLOWED_ORIGINS = WEB_ORIGIN;
  resetClerkForTests();
});

afterAll(() => {
  process.env = savedEnv;
  resetClerkForTests();
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  database.companyScope.mockImplementation((_db: unknown, companyId: string) => ({ companyId }));
  database.findUserByAuthSubject.mockResolvedValue(activeUser);
  database.findActivePlatformAdmin.mockResolvedValue(null);
  database.loadUserAccess.mockResolvedValue({ candidateProfile: null, companyMemberships: [] });
});

describe("session tokens", () => {
  it("accepts a valid token and returns the user from the database", async () => {
    const response = await callMe(meRequest(signToken()));
    expect(response.status).toBe(200);
    expect((await response.json()).data.id).toBe(activeUser.id);
    expect(database.findUserByAuthSubject).toHaveBeenCalledWith(expect.anything(), CLERK_ID);
  });

  it("accepts a token from an allowed browser origin", async () => {
    expect((await callMe(meRequest(signToken({ azp: WEB_ORIGIN })))).status).toBe(200);
  });

  it("accepts a native token with no web origin", async () => {
    expect((await callMe(meRequest(signToken({ azp: "clerk://com.skillprove.app" })))).status).toBe(200);
    expect((await callMe(meRequest(signToken()))).status).toBe(200);
  });

  it.each([
    ["missing", undefined],
    ["from a lookalike origin", signToken({ azp: "http://localhost:3000.evil.example" })],
    ["malformed", "not-a-token"],
    ["expired", signToken({ iat: 1000, nbf: 1000, exp: 2000 })],
    ["signed by another key", signToken({}, otherKey)],
    ["from another site", signToken({ azp: "https://evil.example" })],
    ["with no subject", signToken({ sub: undefined })],
    ["not yet valid", signToken({ nbf: Math.floor(Date.now() / 1000) + 3600 })],
  ])("rejects a token that is %s with a 401", async (_name, token) => {
    const response = await callMe(meRequest(token));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Sign in to continue." },
    });
    expect(database.findUserByAuthSubject).not.toHaveBeenCalled();
  });

  it("rejects an unsigned token", async () => {
    const forged = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: CLERK_ID, iss: ISSUER })}.`;
    expect((await callMe(meRequest(forged))).status).toBe(401);
  });

  it("ignores session cookies, so cross-site requests carry no authority", async () => {
    const response = await callMe(meRequest(undefined, { cookie: `__session=${signToken()}` }));
    expect(response.status).toBe(401);
  });

  it("ignores client-supplied identity and role headers", async () => {
    const response = await callMe(
      meRequest(undefined, {
        "x-user-id": activeUser.id,
        "x-clerk-auth-user-id": CLERK_ID,
        "x-role": "PLATFORM_ADMIN",
      }),
    );
    expect(response.status).toBe(401);

    const signedIn = await callMe(
      meRequest(signToken(), { "x-user-id": "someone-else", "x-role": "PLATFORM_ADMIN" }),
    );
    expect((await signedIn.json()).data).toMatchObject({
      id: activeUser.id,
      isPlatformAdmin: false,
      companies: [],
    });
  });

  it("ignores role claims inside a valid token", async () => {
    const response = await callMe(meRequest(signToken({ role: "PLATFORM_ADMIN", org_role: "OWNER" })));
    expect((await response.json()).data.isPlatformAdmin).toBe(false);
  });

  it.each(["SUSPENDED", "DELETION_REQUESTED"])("returns 403 for a %s user", async (status) => {
    database.findUserByAuthSubject.mockResolvedValue({ ...activeUser, status });
    const response = await callMe(meRequest(signToken()));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("does not leak internal errors", async () => {
    database.findUserByAuthSubject.mockRejectedValue(new Error("postgres://user:secret@host"));
    const response = await callMe(meRequest(signToken()));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("secret");
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("secret");
  });
});

describe("user created before the webhook arrives", () => {
  it("syncs the user on first authenticated request", async () => {
    database.findUserByAuthSubject.mockResolvedValue(null);
    database.syncIdentity.mockResolvedValue(activeUser);
    vi.spyOn(getClerk().users, "getUser").mockResolvedValue(clerkUser() as never);

    expect((await callMe(meRequest(signToken()))).status).toBe(200);
    expect(database.syncIdentity).toHaveBeenCalledWith(expect.anything(), {
      authSubject: CLERK_ID,
      verifiedEmail: "person@test.invalid",
    });
  });

  it("returns 401 and anonymizes if Clerk says the user is gone", async () => {
    database.findUserByAuthSubject.mockResolvedValue(null);
    vi.spyOn(getClerk().users, "getUser").mockRejectedValue({ status: 404 });

    expect((await callMe(meRequest(signToken()))).status).toBe(401);
    expect(database.anonymizeIdentity).toHaveBeenCalledWith(expect.anything(), CLERK_ID);
  });
});

describe("toVerifiedEmail", () => {
  it("uses the primary address when verified", () => {
    expect(toVerifiedEmail(clerkUser() as never)).toBe("person@test.invalid");
  });

  it("does not trust an unverified primary, even with another verified address", () => {
    expect(toVerifiedEmail(clerkUser("unverified") as never)).toBeNull();
  });
});

describe("Clerk webhook", () => {
  const event = (type: string, data = { id: CLERK_ID }) => ({ type, data, object: "event" });

  it("rejects bad signatures, wrong keys and stale deliveries before doing anything", async () => {
    const getUser = vi.spyOn(getClerk().users, "getUser");
    const unsigned = new Request("http://localhost:4000/api/v1/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify(event("user.deleted")),
    });
    const tampered = webhookRequest(event("user.updated"));
    const tamperedBody = new Request(tampered.url, {
      method: "POST",
      headers: tampered.headers,
      body: JSON.stringify(event("user.deleted")),
    });

    for (const request of [
      unsigned,
      tamperedBody,
      webhookRequest(event("user.deleted"), { key: randomBytes(24) }),
      webhookRequest(event("user.deleted"), { timestamp: 1000 }),
    ]) {
      expect((await postWebhook(request)).status).toBe(400);
    }
    expect(getUser).not.toHaveBeenCalled();
    expect(database.anonymizeIdentity).not.toHaveBeenCalled();
  });

  it("syncs from Clerk's current state, not the payload", async () => {
    vi.spyOn(getClerk().users, "getUser").mockResolvedValue(clerkUser() as never);
    const payload = event("user.updated", {
      id: CLERK_ID,
      email_addresses: [{ email_address: "forged@test.invalid" }],
    } as never);

    expect((await postWebhook(webhookRequest(payload))).status).toBe(200);
    expect(database.syncIdentity).toHaveBeenCalledWith(expect.anything(), {
      authSubject: CLERK_ID,
      verifiedEmail: "person@test.invalid",
    });
  });

  it("does not revive a deleted user when an old update arrives late", async () => {
    vi.spyOn(getClerk().users, "getUser").mockRejectedValue({ status: 404 });

    expect((await postWebhook(webhookRequest(event("user.updated")))).status).toBe(200);
    expect(database.syncIdentity).not.toHaveBeenCalled();
    expect(database.anonymizeIdentity).toHaveBeenCalledWith(expect.anything(), CLERK_ID);
  });

  it("does not delete a user who still exists when given a stale delete", async () => {
    vi.spyOn(getClerk().users, "getUser").mockResolvedValue(clerkUser() as never);

    expect((await postWebhook(webhookRequest(event("user.deleted")))).status).toBe(200);
    expect(database.anonymizeIdentity).not.toHaveBeenCalled();
  });

  it("returns 500 so Clerk retries when Clerk's API fails", async () => {
    vi.spyOn(getClerk().users, "getUser").mockRejectedValue({ status: 503 });
    expect((await postWebhook(webhookRequest(event("user.updated")))).status).toBe(500);
    expect(database.anonymizeIdentity).not.toHaveBeenCalled();
  });

  it("acknowledges unrelated events without acting", async () => {
    const getUser = vi.spyOn(getClerk().users, "getUser");
    expect((await postWebhook(webhookRequest(event("session.created")))).status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("authorization guards", () => {
  const expectForbidden = async (promise: Promise<unknown>) =>
    expect(promise).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

  it("requires an active admin-level platform role", async () => {
    await expectForbidden(requirePlatformAdmin(activeUser));

    database.findActivePlatformAdmin.mockResolvedValue({ role: "SUPPORT" });
    await expectForbidden(requirePlatformAdmin(activeUser));

    database.findActivePlatformAdmin.mockResolvedValue({ role: "ADMIN" });
    await expect(requirePlatformAdmin(activeUser)).resolves.toBeDefined();
  });

  it("denies a company with no membership, and gives no data scope", async () => {
    database.findActiveCompanyMembership.mockResolvedValue(null);
    await expectForbidden(requireCompanyMembership(activeUser, COMPANY_ID));
    expect(database.companyScope).not.toHaveBeenCalled();
  });

  it("looks membership up by the authenticated user, and scopes to that company", async () => {
    database.findActiveCompanyMembership.mockResolvedValue({ role: "VIEWER" });
    const { scope } = await requireCompanyMembership(activeUser, COMPANY_ID);

    expect(database.findActiveCompanyMembership).toHaveBeenCalledWith(
      expect.anything(),
      activeUser.id,
      COMPANY_ID,
    );
    expect(scope).toEqual({ companyId: COMPANY_ID });
  });

  it("treats a malformed company ID the same as no access", async () => {
    await expectForbidden(requireCompanyMembership(activeUser, "1 OR 1=1"));
    expect(database.findActiveCompanyMembership).not.toHaveBeenCalled();
  });

  it("enforces company roles", async () => {
    database.findActiveCompanyMembership.mockResolvedValue({ role: "RECRUITER" });
    await expectForbidden(requireCompanyRole(activeUser, COMPANY_ID, ["OWNER", "ADMIN"]));
    await expect(requireCompanyRole(activeUser, COMPANY_ID, ["RECRUITER"])).resolves.toBeDefined();
  });

  it("limits candidate data to the candidate", () => {
    expect(() => requireCandidateAccess(activeUser, activeUser.id)).not.toThrow();
    expect(() => requireCandidateAccess(activeUser, COMPANY_ID)).toThrow(/permission/);
  });
});

describe("default route protection", () => {
  const through = (path: string, headers?: Record<string, string>) =>
    proxy(new NextRequest(`http://localhost:4000${path}`, { headers }));

  it.each(["/api/v1/me", "/api/v1/companies/x", "/api/v1/future-route", "/api/v1"])(
    "blocks %s without a token",
    async (path) => {
      const response = through(path);
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    },
  );

  it.each(["/api/v1/health", "/api/v1/health/ready", "/api/v1/webhooks/clerk", "/api/v1/health/"])(
    "leaves %s public",
    (path) => {
      expect(through(path).status).toBe(200);
    },
  );

  it("does not make lookalike paths public", () => {
    expect(through("/api/v1/health/secret").status).toBe(401);
    expect(through("/api/v1/webhooks/clerk/other").status).toBe(401);
  });

  it("lets a request with a token reach the route, which verifies it", () => {
    expect(through("/api/v1/me", { authorization: "Bearer x" }).status).toBe(200);
  });

  it("still sends CORS headers on a 401, so browsers can read the error", () => {
    const response = through("/api/v1/me", { origin: WEB_ORIGIN });
    expect(response.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
  });

  it("answers preflights without a token", () => {
    const response = proxy(
      new NextRequest("http://localhost:4000/api/v1/me", {
        method: "OPTIONS",
        headers: { origin: WEB_ORIGIN, "access-control-request-method": "GET" },
      }),
    );
    expect(response.status).toBe(204);
  });
});
