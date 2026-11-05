import { describe, expect, it } from "vitest";
import { checkDatabaseConnection, createPrismaClient } from "./index";
import { hasNoTestDatabase, useTestDatabase } from "./tests/support";

describe.skipIf(hasNoTestDatabase)("database integration", () => {
  const client = useTestDatabase();

  it("connects to the database", async () => {
    await expect(checkDatabaseConnection(client)).resolves.toBeUndefined();
  });
});

describe("checkDatabaseConnection", () => {
  it("rejects when the database is unreachable", async () => {
    const client = createPrismaClient("postgresql://user:pass@127.0.0.1:1/none");
    await expect(checkDatabaseConnection(client)).rejects.toThrow();
    await client.$disconnect();
  });
});
