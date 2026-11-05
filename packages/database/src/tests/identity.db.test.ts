import { describe, expect, it } from "vitest";
import { createCompany, createUser, hasNoTestDatabase, useTestDatabase } from "./support";

describe.skipIf(hasNoTestDatabase)("users and companies", () => {
  const db = useTestDatabase();

  it("creates and retrieves a user with Kosovo defaults", async () => {
    const user = await createUser(db);
    const found = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(found.email).toBe(user.email);
    expect(found.locale).toBe("sq");
    expect(found.timezone).toBe("Europe/Belgrade");
    expect(found.status).toBe("ACTIVE");
  });

  it("rejects duplicate and non-lowercase emails", async () => {
    const user = await createUser(db);
    await expect(db.user.create({ data: { email: user.email } })).rejects.toThrow();
    await expect(db.user.create({ data: { email: "Mixed@test.invalid" } })).rejects.toThrow();
  });

  it("requires an anonymized user to hold no identity", async () => {
    const user = await createUser(db);
    await expect(
      db.user.update({
        where: { id: user.id },
        data: { status: "ANONYMIZED", anonymizedAt: new Date() },
      }),
    ).rejects.toThrow();
    const done = await db.user.update({
      where: { id: user.id },
      data: { status: "ANONYMIZED", anonymizedAt: new Date(), email: null },
    });
    expect(done.status).toBe("ANONYMIZED");
  });

  it("links a candidate profile and its details, private by default", async () => {
    const user = await createUser(db);
    const profile = await db.candidateProfile.create({
      data: {
        userId: user.id,
        fullName: "Test Candidate",
        experiences: {
          create: { companyName: "Past Co", title: "Dev", startDate: new Date("2020-01-01") },
        },
        education: { create: { institution: "Test University" } },
        languages: { create: { languageCode: "sq", proficiency: "NATIVE" } },
        availability: { create: { employmentTypes: ["FULL_TIME"], workModes: ["REMOTE"] } },
        privacySettings: { create: {} },
      },
      include: {
        experiences: true,
        education: true,
        languages: true,
        availability: true,
        privacySettings: true,
      },
    });

    expect(profile.experiences).toHaveLength(1);
    expect(profile.availability?.salaryCurrency).toBe("EUR");
    expect(profile.countryCode).toBe("XK");
    expect(profile.privacySettings).toMatchObject({
      visibility: "PRIVATE",
      isDiscoverable: false,
      showContactEmail: false,
      showPhoneNumber: false,
    });
  });

  it("enforces profile value rules", async () => {
    const user = await createUser(db);
    const profile = await db.candidateProfile.create({
      data: { userId: user.id, fullName: "Test Candidate" },
    });

    await expect(
      db.candidateProfile.update({ where: { id: profile.id }, data: { phoneNumber: "044123456" } }),
    ).rejects.toThrow();
    await expect(
      db.candidateProfile.update({
        where: { id: profile.id },
        data: { websiteUrl: "javascript:alert(1)" },
      }),
    ).rejects.toThrow();
    await expect(
      db.candidateExperience.create({
        data: {
          profileId: profile.id,
          companyName: "Co",
          title: "Dev",
          startDate: new Date("2022-01-01"),
          endDate: new Date("2021-01-01"),
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.candidateAvailability.create({
        data: { profileId: profile.id, salaryMin: 2000, salaryMax: 1000 },
      }),
    ).rejects.toThrow();
  });

  it("lets one user hold different roles in several companies", async () => {
    const user = await createUser(db);
    const [first, second] = [await createCompany(db), await createCompany(db)];
    await db.companyMember.create({
      data: { companyId: first.id, userId: user.id, role: "OWNER" },
    });
    await db.companyMember.create({
      data: { companyId: second.id, userId: user.id, role: "VIEWER" },
    });

    const memberships = await db.companyMember.findMany({ where: { userId: user.id } });
    expect(memberships.map((m) => m.role).sort()).toEqual(["OWNER", "VIEWER"]);
  });

  it("allows one membership per company", async () => {
    const user = await createUser(db);
    const company = await createCompany(db);
    const data = { companyId: company.id, userId: user.id, role: "VIEWER" as const };
    await db.companyMember.create({ data });
    await expect(db.companyMember.create({ data })).rejects.toThrow();
  });

  it("keeps platform admin rights separate from membership", async () => {
    const user = await createUser(db);
    await db.platformAdmin.create({ data: { userId: user.id, role: "SUPPORT" } });
    expect(await db.companyMember.count({ where: { userId: user.id } })).toBe(0);
  });

  it("allows one pending invitation per email per company", async () => {
    const company = await createCompany(db);
    const invitation = (tokenHash: string) => ({
      companyId: company.id,
      email: "invitee@test.invalid",
      role: "RECRUITER" as const,
      tokenHash,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const first = await db.companyInvitation.create({
      data: invitation(crypto.randomUUID()),
    });
    await expect(
      db.companyInvitation.create({ data: invitation(crypto.randomUUID()) }),
    ).rejects.toThrow();

    await db.companyInvitation.update({ where: { id: first.id }, data: { status: "REVOKED" } });
    await expect(
      db.companyInvitation.create({ data: invitation(crypto.randomUUID()) }),
    ).resolves.toBeDefined();
  });

  it("requires a file to have exactly one owner", async () => {
    const user = await createUser(db);
    const company = await createCompany(db);
    const file = {
      purpose: "PORTFOLIO" as const,
      bucket: "test",
      mimeType: "application/pdf",
      sizeBytes: 1,
    };
    await expect(
      db.fileAsset.create({ data: { ...file, objectKey: crypto.randomUUID() } }),
    ).rejects.toThrow();
    await expect(
      db.fileAsset.create({
        data: {
          ...file,
          objectKey: crypto.randomUUID(),
          ownerUserId: user.id,
          ownerCompanyId: company.id,
        },
      }),
    ).rejects.toThrow();
  });
});
