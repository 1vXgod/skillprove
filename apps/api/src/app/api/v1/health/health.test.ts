import { apiFailureSchema, apiSuccessSchema, healthSchema, readinessSchema } from "@skillprove/validation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHealth } from "./route";
import { GET as getReady } from "./ready/route";

const { getDb, checkDatabaseConnection } = vi.hoisted(() => ({
  getDb: vi.fn(),
  checkDatabaseConnection: vi.fn(),
}));

vi.mock("../../../../lib/db", () => ({ getDb }));
vi.mock("@skillprove/database", () => ({ checkDatabaseConnection }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/v1/health", () => {
  it("returns a valid liveness response without using the database", async () => {
    const response = await getHealth();

    expect(response.status).toBe(200);
    apiSuccessSchema(healthSchema).parse(await response.json());
    expect(getDb).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/health/ready", () => {
  it("reports ready when the database responds", async () => {
    getDb.mockReturnValue({});
    checkDatabaseConnection.mockResolvedValue(undefined);

    const response = await getReady();

    expect(response.status).toBe(200);
    apiSuccessSchema(readinessSchema).parse(await response.json());
  });

  it("returns 503 when no database is configured", async () => {
    getDb.mockReturnValue(null);

    const response = await getReady();

    expect(response.status).toBe(503);
    expect(apiFailureSchema.parse(await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 503 without leaking connection details when the database fails", async () => {
    getDb.mockReturnValue({});
    checkDatabaseConnection.mockRejectedValue(new Error("postgres://user:secret@host/db refused"));

    const response = await getReady();
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(text).not.toContain("secret");
  });
});
