import { describe, expect, it, vi } from "vitest";

const { PrismaPg } = vi.hoisted(() => ({ PrismaPg: vi.fn() }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg }));
vi.mock("./generated/prisma/client", () => ({ PrismaClient: vi.fn(), Prisma: {} }));

const { createPrismaClient } = await import("./index");

describe("createPrismaClient", () => {
  it("passes the connection string through and allows 15 seconds to connect", () => {
    const url = "postgresql://user:hunter2@ep-example-pooler.eu.aws.neon.tech/neondb?sslmode=verify-full";
    createPrismaClient(url);
    expect(PrismaPg).toHaveBeenCalledExactlyOnceWith({ connectionString: url, connectionTimeoutMillis: 15_000 });
  });
});
