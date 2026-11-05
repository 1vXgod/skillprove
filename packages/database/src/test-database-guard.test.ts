import { describe, expect, it } from "vitest";
import {
  assertExpectedBranch,
  checkTestDatabaseUrl,
  UnsafeTestDatabaseError,
} from "./test-database-guard";

const dev = "postgresql://user:hunter2@ep-dev-1.eu.aws.neon.tech/neondb";
const devPooled = "postgresql://user:hunter2@ep-dev-1-pooler.eu.aws.neon.tech/neondb";
const testBranch = "postgresql://user:hunter2@ep-test-2.eu.aws.neon.tech/neondb";

function check(url: string, allowedBranchId?: string) {
  return checkTestDatabaseUrl({ url, protectedUrls: [dev, devPooled], allowedBranchId });
}

describe("checkTestDatabaseUrl", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("allows the local host %s", (host) => {
    expect(check(`postgres://u:p@${host}:5432/db`)).toEqual({ requiredBranchId: null });
  });

  it("allows a different Neon endpoint when its branch is named", () => {
    expect(check(testBranch, "br-test")).toEqual({ requiredBranchId: "br-test" });
  });

  it("refuses a remote Neon database with no named branch", () => {
    expect(() => check(testBranch)).toThrow(UnsafeTestDatabaseError);
  });

  it.each([
    ["direct", dev],
    ["pooled", devPooled],
  ])("refuses the application's %s endpoint even when a branch is named", (_name, url) => {
    expect(() => check(url, "br-test")).toThrow(/same endpoint/);
  });

  it("recognises the application's endpoint across pooled and direct forms", () => {
    const refused = () =>
      checkTestDatabaseUrl({ url: devPooled, protectedUrls: [dev], allowedBranchId: "br-test" });
    expect(refused).toThrow(/same endpoint/);
  });

  it("refuses remote hosts that are not Neon", () => {
    expect(() => check("postgres://u:p@db.example.com/prod", "br-test")).toThrow(/Neon/);
  });

  it("refuses a lookalike of a Neon host", () => {
    expect(() => check("postgres://u:p@neon.tech.example.com/db", "br-test")).toThrow(/Neon/);
  });

  it("refuses a URL it cannot parse, without repeating it", () => {
    expect(() => check("not a url hunter2")).toThrow(UnsafeTestDatabaseError);
    expect(() => check("not a url hunter2")).not.toThrow(/hunter2/);
  });

  it("never includes credentials in its messages", () => {
    expect(() => check(dev, "br-test")).not.toThrow(/hunter2/);
  });
});

describe("assertExpectedBranch", () => {
  it("passes on the named branch", () => {
    expect(() => assertExpectedBranch("br-test", "br-test")).not.toThrow();
  });

  it.each([["br-main"], [null]])("refuses when the server reports %s", (actual) => {
    expect(() => assertExpectedBranch(actual, "br-test")).toThrow(UnsafeTestDatabaseError);
  });
});
