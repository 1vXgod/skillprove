import { describe, expect, it } from "vitest";
import { getEnv } from "./env";

describe("getEnv", () => {
  it("parses a comma-separated origin list", () => {
    const env = getEnv({ CORS_ALLOWED_ORIGINS: "http://localhost:3000, https://app.example.com" });
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(["http://localhost:3000", "https://app.example.com"]);
  });

  it("allows no browser origins by default", () => {
    expect(getEnv({}).CORS_ALLOWED_ORIGINS).toEqual([]);
  });

  it.each(["*", "app.example.com", "https://app.example.com/", "https://app.example.com/path"])(
    "rejects %s as an origin",
    (value) => {
      expect(() => getEnv({ CORS_ALLOWED_ORIGINS: value })).toThrow();
    },
  );

  it("treats an empty DATABASE_URL as not configured", () => {
    expect(getEnv({ DATABASE_URL: "" }).DATABASE_URL).toBeUndefined();
  });
});
