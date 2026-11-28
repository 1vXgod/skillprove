import { describe, expect, it } from "vitest";
import { clerkAccountPortalUrl } from "./clerk";

declare const btoa: (data: string) => string;

const key = (prefix: string, host: string) => `${prefix}${btoa(`${host}$`)}`;

describe("clerkAccountPortalUrl", () => {
  it("maps a development key to the accounts.dev portal", () => {
    expect(clerkAccountPortalUrl(key("pk_test_", "happy-cat-12.clerk.accounts.dev"))).toBe("https://happy-cat-12.accounts.dev/user");
  });
  it("maps a production key to the accounts subdomain", () => {
    expect(clerkAccountPortalUrl(key("pk_live_", "clerk.skillprove.com"))).toBe("https://accounts.skillprove.com/user");
  });
  it("returns null for missing, foreign or malformed keys", () => {
    expect(clerkAccountPortalUrl(undefined)).toBeNull();
    expect(clerkAccountPortalUrl("")).toBeNull();
    expect(clerkAccountPortalUrl("sk_test_abc")).toBeNull();
    expect(clerkAccountPortalUrl(key("pk_test_", "evil.com/x"))).toBeNull();
    expect(clerkAccountPortalUrl(key("pk_test_", "example.com"))).toBeNull();
  });
});
