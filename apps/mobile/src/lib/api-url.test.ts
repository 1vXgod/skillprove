import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api-url";

describe("resolveApiBaseUrl", () => {
  it("prefers the configured URL", () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: "https://api.example.com",
        expoHostUri: "192.168.1.5:8081",
        isDevelopment: true,
      }),
    ).toBe("https://api.example.com");
  });

  it("uses the Expo host and API port in development", () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: undefined,
        expoHostUri: "192.168.1.5:8081",
        isDevelopment: true,
      }),
    ).toBe("http://192.168.1.5:4000");
  });

  it("never guesses a URL in production", () => {
    expect(
      resolveApiBaseUrl({
        configuredUrl: undefined,
        expoHostUri: "192.168.1.5:8081",
        isDevelopment: false,
      }),
    ).toBeNull();
  });

  it("returns null when there is no host to use", () => {
    expect(
      resolveApiBaseUrl({ configuredUrl: "", expoHostUri: undefined, isDevelopment: true }),
    ).toBeNull();
  });
});
