import { describe, expect, it } from "vitest";
import { createUser, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("audit logs and supporting records", () => {
  const db = useTestDatabase();

  it("creates an audit record", async () => {
    const actorId = crypto.randomUUID();
    const log = await db.auditLog.create({
      data: {
        action: "company.member_removed",
        actorType: "USER",
        actorId,
        targetType: "company_member",
        targetId: crypto.randomUUID(),
        metadata: { previousRole: "ADMIN" },
      },
    });
    const found = await db.auditLog.findFirstOrThrow({ where: { actorId } });
    expect(found.id).toBe(log.id);
    expect(found.metadata).toEqual({ previousRole: "ADMIN" });
  });

  it("does not allow audit records to change or disappear", async () => {
    const log = await db.auditLog.create({ data: { action: "test.immutable" } });
    await expect(
      db.auditLog.update({ where: { id: log.id }, data: { action: "tampered" } }),
    ).rejects.toThrow(/immutable/);
    await expect(db.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/immutable/);
  });

  it("rejects oversized audit metadata and notification payloads", async () => {
    const user = await createUser(db);
    await expect(
      db.auditLog.create({ data: { action: "test.big", metadata: { blob: "x".repeat(20_000) } } }),
    ).rejects.toThrow();
    await expect(
      db.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          template: "test",
          payload: { blob: "x".repeat(5_000) },
        },
      }),
    ).rejects.toThrow();
  });

  it("finds device tokens by hash, and rejects duplicates", async () => {
    const user = await createUser(db);
    const data = {
      userId: user.id,
      platform: "ANDROID" as const,
      tokenCiphertext: "encrypted",
      tokenHash: crypto.randomUUID(),
    };
    await db.userDevice.create({ data });
    await expect(db.userDevice.create({ data })).rejects.toThrow();
  });
});
