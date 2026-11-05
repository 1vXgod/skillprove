import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, unavailable, withErrorHandling } from "./http";

class PrismaClientKnownRequestError extends Error {
  override name = "PrismaClientKnownRequestError";
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

describe("describeError", () => {
  it("keeps the class, the Prisma code and the reason", () => {
    const error = new PrismaClientKnownRequestError(
      "\nInvalid `tx.user.create()` invocation in\nC:\\app\\identity.ts:45:43\n\nTransaction API error: Unable to start a transaction in the given time.",
      "P2028",
    );
    expect(describeError(error)).toEqual({
      name: "PrismaClientKnownRequestError",
      code: "P2028",
      message: "Transaction API error: Unable to start a transaction in the given time.",
    });
  });

  it("uses the cause's code when the error has none", () => {
    const error = new Error("Connection terminated due to connection timeout", { cause: { code: "ETIMEDOUT" } });
    expect(describeError(error)).toMatchObject({ name: "Error", code: "ETIMEDOUT" });
  });

  it("redacts URLs, tokens, keys, emails and quoted values", () => {
    const message = [
      "failed postgresql://user:npg_hunter2@ep-x-pooler.neon.tech/db?sslmode=verify-full",
      "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2ln",
      "sk_test_abc123 whsec_xyz789 person@example.com value 'Arlind Jashari'",
    ].join(" ");
    const { message: logged } = describeError(new Error(message));
    for (const secret of ["npg_hunter2", "neon.tech", "eyJ", "sk_test", "whsec_", "person@", "Arlind"]) {
      expect(logged).not.toContain(secret);
    }
    expect(logged).toContain("<url>");
    expect(logged).toContain("<email>");
  });

  it("ignores codes that are not plain identifiers, and caps the length", () => {
    const error = Object.assign(new Error("x".repeat(500)), { code: "not a code; postgres://x" });
    const described = describeError(error);
    expect(described.code).toBeUndefined();
    expect(described.message).toHaveLength(200);
  });

  it("describes non-Error values by type only", () => {
    expect(describeError("postgres://user:secret@host")).toEqual({ name: "string" });
  });
});

describe("withErrorHandling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs diagnostics but answers with a generic 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandling(() => {
      throw new PrismaClientKnownRequestError("Unique constraint failed on person@example.com", "P2002");
    });
    const response = await handler();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toContain("P2002");
    expect(logged).toContain("PrismaClientKnownRequestError");
    expect(logged).not.toContain("person@example.com");
  });

  it("returns expected errors as they are, without logging", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await withErrorHandling(() => {
      throw unavailable();
    })();
    expect(response.status).toBe(503);
    expect(log).not.toHaveBeenCalled();
  });
});
