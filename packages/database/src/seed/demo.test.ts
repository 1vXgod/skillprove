import { decodeQuestion, encodeQuestion } from "@skillprove/assessment-engine";
import { describe, expect, it } from "vitest";
import { UnsafeTestDatabaseError } from "../test-database-guard";
import { checkDemoDatabaseUrl, DEMO_ASSESSMENTS, demoQuestionContent, parseProductionHosts } from "./demo";

const dev = "postgresql://user:hunter2@ep-dev-1.eu.aws.neon.tech/neondb";
const devPooled = "postgresql://user:hunter2@ep-dev-1-pooler.eu.aws.neon.tech/neondb";
const branch = "postgresql://user:hunter2@ep-demo-2.eu.aws.neon.tech/neondb";
const prod = "postgresql://user:hunter2@ep-prod-9.eu.aws.neon.tech/neondb";
const local = "postgres://u:p@localhost:5432/db";

type Options = { branchId?: string; nodeEnv?: string; allowDev?: boolean; productionHosts?: string };
const check = (url: string, options: Options = {}) =>
  checkDemoDatabaseUrl({
    url,
    protectedUrls: [dev],
    allowedBranchId: options.branchId,
    nodeEnv: options.nodeEnv ?? "development",
    allowDevDatabase: options.allowDev ?? false,
    productionHosts: parseProductionHosts(options.productionHosts),
  });

describe("demo seed guard", () => {
  it("allows a local database, or a named Neon branch that is not an application database", () => {
    expect(check(local)).toEqual({ requiredBranchId: null });
    expect(check(branch, { branchId: "br-demo" })).toEqual({ requiredBranchId: "br-demo" });
  });

  it("allows the configured development database only with DEMO_ALLOW_DEV_DATABASE=1", () => {
    expect(() => check(dev)).toThrow(/DEMO_ALLOW_DEV_DATABASE=1/);
    expect(check(dev, { allowDev: true })).toEqual({ requiredBranchId: null });
    expect(check(devPooled, { allowDev: true })).toEqual({ requiredBranchId: null });
  });

  it.each<[string, string, Options]>([
    ["NODE_ENV=production, even with the opt-in", dev, { nodeEnv: "production", allowDev: true }],
    ["NODE_ENV=production for a local database", local, { nodeEnv: "production" }],
    ["a host in PRODUCTION_DATABASE_HOSTS", prod, { branchId: "br-prod", productionHosts: "ep-prod-9.eu.aws.neon.tech" }],
    ["a production host given by its pooled name", prod, { branchId: "br-prod", productionHosts: " ep-prod-9-pooler.eu.aws.neon.tech , other.host" }],
    ["the development database when it is also listed as production", dev, { allowDev: true, productionHosts: "ep-dev-1.eu.aws.neon.tech" }],
    ["an unconfigured Neon database with the opt-in but no branch ID", branch, { allowDev: true }],
    ["a database that is not local or Neon", "postgresql://u:p@db.example.com/app", { branchId: "br-x" }],
  ])("refuses %s", (_label, url, options) => {
    expect(() => check(url, options)).toThrow(UnsafeTestDatabaseError);
    expect(() => check(url, options)).toThrow(/Refusing to run the demo seed/);
  });

  it("never puts a connection string in its messages", () => {
    expect(() => check(dev)).toThrow(expect.objectContaining({ message: expect.not.stringContaining("hunter2") }));
    expect(() => check(prod, { productionHosts: "ep-prod-9.eu.aws.neon.tech" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("hunter2") }),
    );
  });

  it("reads an empty production list as no production hosts", () => {
    expect(parseProductionHosts(undefined)).toEqual([]);
    expect(parseProductionHosts(" , ")).toEqual([]);
  });
});

describe("demo assessments", () => {
  it("are valid authoring content that scoring can read back, with weights totalling 100", () => {
    for (const demo of DEMO_ASSESSMENTS) {
      expect(Object.values(demo.skills).reduce((a, b) => a + b, 0)).toBe(100);
      expect(demo.questions.every((q) => q.skill in demo.skills)).toBe(true);
      for (const question of demo.questions) {
        // Throws if a question does not pass the authoring schema.
        const content = demoQuestionContent(question, "11111111-1111-4111-8111-111111111111", demo.difficulty);
        expect(decodeQuestion(encodeQuestion(content))).toEqual(content);
      }
    }
  });
});
