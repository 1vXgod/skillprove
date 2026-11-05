import { describe, expect, it } from "vitest";
import { apiFailureSchema, apiSuccessSchema, healthSchema } from "./index";

const validHealth = {
  status: "ok",
  service: "skillprove-api",
  apiVersion: "v1",
  timestamp: "2026-11-02T10:00:00.000Z",
};

describe("response schemas", () => {
  it("accepts a valid health envelope", () => {
    const parsed = apiSuccessSchema(healthSchema).parse({ success: true, data: validHealth });
    expect(parsed.data.status).toBe("ok");
  });

  it("rejects a success envelope with invalid data", () => {
    const result = apiSuccessSchema(healthSchema).safeParse({
      success: true,
      data: { ...validHealth, timestamp: "yesterday" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects error codes outside the shared list", () => {
    const result = apiFailureSchema.safeParse({
      success: false,
      error: { code: "TEAPOT", message: "No" },
    });
    expect(result.success).toBe(false);
  });
});
