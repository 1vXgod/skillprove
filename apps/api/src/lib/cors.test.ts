import { describe, expect, it } from "vitest";
import { evaluateCors } from "./cors";

const allowed = ["http://localhost:3000"];

function evaluate(origin: string | null, method = "GET", requestedMethod: string | null = null) {
  return evaluateCors({ origin, method, requestedMethod }, allowed);
}

describe("evaluateCors", () => {
  it("adds no CORS headers to native requests without an Origin", () => {
    const result = evaluate(null);
    expect(result.headers).toEqual({ Vary: "Origin" });
    expect(result.preflightStatus).toBeUndefined();
  });

  it("echoes an allowed origin", () => {
    expect(evaluate(allowed[0] ?? "").headers["Access-Control-Allow-Origin"]).toBe(allowed[0]);
  });

  it("does not grant access to other origins", () => {
    const result = evaluate("https://evil.example");
    expect(result.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(result.preflightStatus).toBeUndefined();
  });

  it("matches origins exactly", () => {
    const lookalike = evaluate("http://localhost:3000.evil.example");
    expect(lookalike.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("answers an allowed preflight with 204 and the permitted methods", () => {
    const result = evaluate(allowed[0] ?? "", "OPTIONS", "POST");
    expect(result.preflightStatus).toBe(204);
    expect(result.headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(result.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("allows the Idempotency-Key header that AI generation sends", () => {
    const allowedHeaders = evaluate(allowed[0] ?? "", "OPTIONS", "POST").headers["Access-Control-Allow-Headers"] ?? "";
    expect(allowedHeaders.split(", ")).toEqual(["Authorization", "Content-Type", "Accept", "Idempotency-Key"]);
  });

  it("rejects a preflight from a disallowed origin", () => {
    const result = evaluate("https://evil.example", "OPTIONS", "POST");
    expect(result.preflightStatus).toBe(403);
    expect(result.headers["Access-Control-Allow-Methods"]).toBeUndefined();
  });

  it("does not treat a plain OPTIONS request as a preflight", () => {
    expect(evaluate(allowed[0] ?? "", "OPTIONS").preflightStatus).toBeUndefined();
    expect(evaluate(null, "OPTIONS", "POST").preflightStatus).toBeUndefined();
  });
});
