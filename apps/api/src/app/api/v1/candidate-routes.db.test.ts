import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { createPrismaClient, type PrismaClient } from "@skillprove/database";
import {
  apiFailureSchema,
  candidateViewSchema,
  experienceSchema,
  ownProfileSchema,
  profilePreviewSchema,
  selfReportedSkillSchema,
  skillPassportSchema,
  skillSearchResultSchema,
} from "@skillprove/validation";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetClerkForTests } from "../../../lib/auth/clerk";
import { GET as getCandidate } from "./candidates/[profileId]/route";
import { DELETE as deleteItem, PUT as putItem } from "./me/profile/[section]/[id]/route";
import { POST as postItem } from "./me/profile/[section]/route";
import { PUT as putPrivacy } from "./me/profile/privacy/route";
import { GET as getPreview } from "./me/profile/preview/route";
import { DELETE as deleteProfile, GET as getProfile, POST as postProfile, PUT as putProfile } from "./me/profile/route";
import { GET as getPassport } from "./me/skill-passport/route";
import { POST as postSkill } from "./me/skills/route";
import { GET as searchSkillsRoute } from "./skills/route";

/**
 * The real route handlers, guards, Clerk token verification and repositories, against a
 * local database. Tokens are signed with a throwaway key, so Clerk is never contacted.
 * Only localhost databases are accepted here.
 */
const url = process.env.TEST_DATABASE_URL;
const isLocal = (() => {
  if (!url) return false;
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Refusing to run API database tests against a non-local database. See docs/database.md.");
  }
  return true;
})();

const holder = vi.hoisted(() => ({ db: null as PrismaClient | null }));
vi.mock("../../../lib/db", () => ({ getDb: () => holder.db }));

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ISSUER = "https://test-instance.clerk.accounts.dev";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
function tokenFor(subject: string) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT", kid: "k" })}.${encode({ iss: ISSUER, sub: subject, sid: "sess", iat: now - 5, nbf: now - 5, exp: now + 120 })}`;
  return `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(privateKey).toString("base64url")}`;
}

type Handler = (request: Request, context: never) => Promise<Response>;

async function call(handler: Handler, options: { token?: string; method?: string; path?: string; body?: unknown; params?: Record<string, string> } = {}) {
  const request = new Request(`http://localhost:4000/api/v1${options.path ?? "/test"}`, {
    method: options.method ?? "GET",
    headers: { ...(options.token ? { authorization: `Bearer ${options.token}` } : {}), "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) } as never);
  return { status: response.status, body: (await response.json()) as { success: boolean; data?: unknown; error?: { code: string; fields?: Record<string, string> } } };
}

const savedEnv = { ...process.env };

describe.skipIf(!isLocal)("candidate API routes", () => {
  beforeAll(() => {
    process.env.CLERK_SECRET_KEY = "test-only-not-a-real-secret";
    process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("test-instance.clerk.accounts.dev$").toString("base64")}`;
    process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
    resetClerkForTests();
    holder.db = createPrismaClient(url ?? "");
  });
  afterAll(async () => {
    await holder.db?.$disconnect();
    process.env = savedEnv;
    resetClerkForTests();
  });

  const db = () => {
    if (!holder.db) throw new Error("No test database.");
    return holder.db;
  };

  /** A user already synced from Clerk, so no Clerk API call is needed. */
  async function signedInUser() {
    const subject = `user_${randomUUID().replaceAll("-", "")}`;
    const user = await db().user.create({ data: { authSubject: subject, email: `${randomUUID()}@test.invalid` } });
    return { user, token: tokenFor(subject) };
  }

  async function companyMember(verificationStatus: "VERIFIED" | "UNVERIFIED") {
    const member = await signedInUser();
    const company = await db().company.create({ data: { name: "Co", slug: `co-${randomUUID()}`, verificationStatus } });
    await db().companyMember.create({ data: { companyId: company.id, userId: member.user.id, role: "RECRUITER" } });
    return member;
  }

  const profileBody = { fullName: "Arta Krasniqi", headline: "Analyst", contactEmail: "Arta@Example.com", phoneNumber: "+383 44 123 456", city: "Prishtinë", interests: ["Data"] };

  async function withProfile() {
    const candidate = await signedInUser();
    const created = await call(postProfile, { token: candidate.token, method: "POST", body: profileBody });
    expect(created.status).toBe(201);
    return { ...candidate, profile: ownProfileSchema.parse(created.body.data) };
  }

  it("requires a valid session", async () => {
    expect((await call(getProfile)).status).toBe(401);
    expect((await call(getProfile, { token: "not-a-token" })).status).toBe(401);
  });

  it("creates, reads and updates the caller's own profile", async () => {
    const { token } = await signedInUser();
    expect((await call(getProfile, { token })).status).toBe(404);

    const invalid = await call(postProfile, { token, method: "POST", body: { fullName: "", linkedinUrl: "javascript:x" } });
    expect(invalid.status).toBe(400);
    expect(apiFailureSchema.parse(invalid.body).error.fields).toEqual({ fullName: "required", linkedinUrl: "invalidUrl" });

    const created = await call(postProfile, { token, method: "POST", body: profileBody });
    const profile = ownProfileSchema.parse(created.body.data);
    expect(profile).toMatchObject({ contactEmail: "arta@example.com", phoneNumber: "+38344123456", privacy: { visibility: "PRIVATE" } });
    expect((await call(postProfile, { token, method: "POST", body: profileBody })).status).toBe(409);

    const updated = await call(putProfile, { token, method: "PUT", body: { ...profileBody, headline: "Lead", expectedUpdatedAt: profile.updatedAt } });
    expect(updated.status).toBe(200);
    const stale = await call(putProfile, { token, method: "PUT", body: { ...profileBody, headline: "Lost", expectedUpdatedAt: profile.updatedAt } });
    expect(stale.status).toBe(409);
    expect(stale.body.error?.code).toBe("CONFLICT");
    expect(ownProfileSchema.parse((await call(getProfile, { token })).body.data).headline).toBe("Lead");
  });

  it("validates sections and keeps them to their owner", async () => {
    const owner = await withProfile();
    const other = await withProfile();
    const params = { section: "experiences" };

    const badDates = await call(postItem, { token: owner.token, method: "POST", params, body: { title: "Dev", companyName: "Co", startDate: "2022-01-01", endDate: "2021-01-01" } });
    expect(badDates.status).toBe(400);
    expect(badDates.body.error?.fields).toEqual({ endDate: "endBeforeStart" });

    const created = await call(postItem, { token: owner.token, method: "POST", params, body: { title: "Dev", companyName: "Co", startDate: "2021-01-01", isCurrent: true } });
    const item = experienceSchema.parse(created.body.data);

    const body = { title: "Taken", companyName: "Co", startDate: "2021-01-01", isCurrent: true, expectedUpdatedAt: item.updatedAt };
    expect((await call(putItem, { token: other.token, method: "PUT", params: { ...params, id: item.id }, body })).status).toBe(404);
    expect((await call(deleteItem, { token: other.token, method: "DELETE", params: { ...params, id: item.id } })).status).toBe(404);
    expect((await call(deleteItem, { token: owner.token, method: "DELETE", params: { section: "unknown", id: item.id } })).status).toBe(404);
    expect((await call(deleteItem, { token: owner.token, method: "DELETE", params: { ...params, id: "1; drop table" } })).status).toBe(404);

    expect((await call(putItem, { token: owner.token, method: "PUT", params: { ...params, id: item.id }, body })).status).toBe(200);
    expect((await call(deleteItem, { token: owner.token, method: "DELETE", params: { ...params, id: item.id } })).status).toBe(200);
  });

  it("stores self-reported skills without any way to claim a score", async () => {
    const { token, user } = await signedInUser();
    const category = await db().skillCategory.create({ data: { slug: `cat-${randomUUID()}` } });
    const skill = await db().skill.create({ data: { slug: `skill-${randomUUID()}`, categoryId: category.id, translations: { create: [{ locale: "sq", name: "Analizë" }, { locale: "en", name: "Analysis" }] } } });

    const added = await call(postSkill, { token, method: "POST", path: "/me/skills?locale=sq", body: { skillId: skill.id, level: "EXPERT", score: 100, verified: true } });
    expect(added.status).toBe(201);
    expect(selfReportedSkillSchema.parse(added.body.data).skill.name).toBe("Analizë");
    expect(await db().verifiedSkillScore.count({ where: { userId: user.id } })).toBe(0);

    const passport = skillPassportSchema.parse((await call(getPassport, { token, path: "/me/skill-passport?locale=en" })).body.data);
    expect(passport.verified).toEqual([]);
    expect(passport.selfReported).toMatchObject([{ skill: { id: skill.id, name: "Analysis" }, level: "EXPERT" }]);

    const search = skillSearchResultSchema.parse((await call(searchSkillsRoute, { token, path: `/skills?q=${skill.slug}&limit=5` })).body.data);
    expect(search.items.map((i) => i.id)).toEqual([skill.id]);
    expect((await call(searchSkillsRoute, { token, path: "/skills?limit=500" })).status).toBe(400);
  });

  it("enforces candidate privacy for other signed-in users", async () => {
    const candidate = await withProfile();
    const path = `/candidates/${candidate.profile.id}`;
    const params = { profileId: candidate.profile.id };
    const plain = await signedInUser();
    const unverified = await companyMember("UNVERIFIED");
    const verified = await companyMember("VERIFIED");

    // Private by default: being signed in, even as a verified company, is not enough.
    for (const viewer of [plain, unverified, verified]) {
      expect((await call(getCandidate, { token: viewer.token, path, params })).status).toBe(404);
    }

    const privacy = { ...candidate.profile.privacy, visibility: "VERIFIED_COMPANIES", expectedUpdatedAt: candidate.profile.privacy.updatedAt };
    expect((await call(putPrivacy, { token: candidate.token, method: "PUT", body: privacy })).status).toBe(200);

    expect((await call(getCandidate, { token: plain.token, path, params })).status).toBe(404);
    expect((await call(getCandidate, { token: unverified.token, path, params })).status).toBe(404);
    const seen = await call(getCandidate, { token: verified.token, path, params });
    expect(seen.status).toBe(200);
    const view = candidateViewSchema.parse(seen.body.data);
    expect(view).toMatchObject({ fullName: "Arta Krasniqi", contact: null, location: null, experiences: null, verifiedSkills: null });
    expect(JSON.stringify(view)).not.toContain("arta@example.com");

    const preview = profilePreviewSchema.parse((await call(getPreview, { token: candidate.token })).body.data);
    expect(preview.visibility).toBe("VERIFIED_COMPANIES");

    // Nobody else can change the candidate's privacy: the route only ever reaches the caller's own profile.
    const hijack = await call(putPrivacy, { token: verified.token, method: "PUT", body: { ...privacy, visibility: "PUBLIC" } });
    expect(hijack.status).toBe(404);
    expect((await call(getCandidate, { token: plain.token, path, params })).status).toBe(404);
  });

  it("deletes the caller's profile", async () => {
    const candidate = await withProfile();
    expect((await call(deleteProfile, { token: candidate.token, method: "DELETE" })).status).toBe(200);
    expect((await call(getProfile, { token: candidate.token })).status).toBe(404);
  });
});
