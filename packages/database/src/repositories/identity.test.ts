import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { anonymizeIdentity, IDENTITY_TRANSACTION_OPTIONS, syncIdentity } from "./identity";

// Records how each interactive transaction is opened. The behaviour itself is covered against a
// real database in tests/identity-sync.db.test.ts and tests/identity.db.test.ts.
function fakeClient(user: object | null) {
  const model = () => ({
    findUnique: vi.fn().mockResolvedValue(user),
    create: vi.fn().mockResolvedValue({ id: "u1" }),
    update: vi.fn().mockResolvedValue({ id: "u1" }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  const tx = new Proxy({}, { get: (cache: Record<string, unknown>, key: string) => (cache[key] ??= model()) });
  const $transaction = vi.fn((run: (t: unknown) => unknown) => run(tx));
  return { client: { $transaction } as unknown as PrismaClient, $transaction };
}

describe("identity transaction limits", () => {
  it("allows 10s to get a connection and 15s in total", () => {
    expect(IDENTITY_TRANSACTION_OPTIONS).toEqual({ maxWait: 10_000, timeout: 15_000 });
  });

  it("syncIdentity opens its transaction with them", async () => {
    const { client, $transaction } = fakeClient(null);
    await syncIdentity(client, { authSubject: "user_1", verifiedEmail: null });
    expect($transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), IDENTITY_TRANSACTION_OPTIONS);
  });

  it("anonymizeIdentity opens its transaction with them", async () => {
    const { client, $transaction } = fakeClient({ id: "u1" });
    await anonymizeIdentity(client, "user_1");
    expect($transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), IDENTITY_TRANSACTION_OPTIONS);
  });
});
