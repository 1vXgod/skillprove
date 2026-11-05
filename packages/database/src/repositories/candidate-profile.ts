import { PROFILE_LIMITS } from "@skillprove/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type {
  AvailabilityStatus,
  EmploymentType,
  LanguageProficiency,
  ProfileVisibility,
  WorkMode,
} from "../generated/prisma/enums";
import { CandidateDataError, isUniqueViolation } from "./candidate-errors";
import { fromDateOnly, toDateOnly } from "./candidate-dates";

/**
 * The candidate's own profile. Every function takes the signed-in user's ID and reaches
 * records only through that user's profile, so one candidate can never touch another's data.
 * Updates carry the `updatedAt` the client last saw and are refused if the record changed since.
 */

export interface ProfileData {
  fullName: string;
  headline: string | null;
  biography: string | null;
  city: string | null;
  countryCode: string;
  phoneNumber: string | null;
  contactEmail: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  interests: string[];
}

export interface AvailabilityData {
  status: AvailabilityStatus;
  employmentTypes: EmploymentType[];
  workModes: WorkMode[];
  availableFrom: string | null;
}

export interface PrivacyData {
  visibility: ProfileVisibility;
  isDiscoverable: boolean;
  showContactEmail: boolean;
  showPhoneNumber: boolean;
  showLocation: boolean;
  showExperience: boolean;
  showEducation: boolean;
  showVerifiedSkills: boolean;
}

export interface ExperienceData {
  title: string;
  companyName: string;
  employmentType: EmploymentType | null;
  location: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export interface EducationData {
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CertificateData {
  name: string;
  issuer: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
}

export interface PortfolioData {
  title: string;
  description: string | null;
  technologies: string[];
  projectUrl: string | null;
  repositoryUrl: string | null;
  completedOn: string | null;
  isVisible: boolean;
}

export interface LanguageData {
  languageCode: string;
  proficiency: LanguageProficiency;
}

export interface Versioned {
  expectedUpdatedAt: string;
}

const iso = (date: Date) => date.toISOString();

export const profileInclude = {
  availability: true,
  privacySettings: true,
  experiences: { orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }, { createdAt: "desc" }] },
  education: { orderBy: [{ endDate: { sort: "desc", nulls: "first" } }, { startDate: { sort: "desc", nulls: "last" } }] },
  certificates: { orderBy: [{ issuedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] },
  portfolioItems: { orderBy: [{ completedOn: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }] },
  languages: { orderBy: [{ proficiency: "desc" }, { languageCode: "asc" }] },
} satisfies Prisma.CandidateProfileInclude;

export type ProfileRow = Prisma.CandidateProfileGetPayload<{ include: typeof profileInclude }>;
type ExperienceRow = ProfileRow["experiences"][number];
type EducationRow = ProfileRow["education"][number];
type CertificateRow = ProfileRow["certificates"][number];
type PortfolioRow = ProfileRow["portfolioItems"][number];
type LanguageRow = ProfileRow["languages"][number];

export const toExperience = (row: ExperienceRow) => ({
  id: row.id,
  title: row.title,
  companyName: row.companyName,
  employmentType: row.employmentType,
  location: row.location,
  description: row.description,
  startDate: toDateOnly(row.startDate),
  endDate: toDateOnly(row.endDate),
  isCurrent: row.isCurrent,
  updatedAt: iso(row.updatedAt),
});

export const toEducation = (row: EducationRow) => ({
  id: row.id,
  institution: row.institution,
  degree: row.degree,
  fieldOfStudy: row.fieldOfStudy,
  description: row.description,
  startDate: toDateOnly(row.startDate),
  endDate: toDateOnly(row.endDate),
  updatedAt: iso(row.updatedAt),
});

export const toCertificate = (row: CertificateRow) => ({
  id: row.id,
  name: row.name,
  issuer: row.issuer,
  credentialId: row.credentialId,
  credentialUrl: row.credentialUrl,
  issuedOn: toDateOnly(row.issuedOn),
  expiresOn: toDateOnly(row.expiresOn),
  hasDocument: row.fileId !== null,
  updatedAt: iso(row.updatedAt),
});

export const toPortfolioItem = (row: PortfolioRow) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  technologies: row.technologies,
  projectUrl: row.projectUrl,
  repositoryUrl: row.repositoryUrl,
  completedOn: toDateOnly(row.completedOn),
  isVisible: row.isVisible,
  hasDocument: row.fileId !== null,
  updatedAt: iso(row.updatedAt),
});

export const toLanguage = (row: LanguageRow) => ({
  id: row.id,
  languageCode: row.languageCode,
  proficiency: row.proficiency,
  updatedAt: iso(row.updatedAt),
});

function toOwnProfile(row: ProfileRow & { availability: NonNullable<ProfileRow["availability"]>; privacySettings: NonNullable<ProfileRow["privacySettings"]> }) {
  const { availability: a, privacySettings: p } = row;
  return {
    id: row.id,
    fullName: row.fullName,
    headline: row.headline,
    biography: row.biography,
    city: row.city,
    countryCode: row.countryCode,
    phoneNumber: row.phoneNumber,
    contactEmail: row.contactEmail,
    linkedinUrl: row.linkedinUrl,
    githubUrl: row.githubUrl,
    websiteUrl: row.websiteUrl,
    interests: row.interests,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    availability: {
      status: a.status,
      employmentTypes: a.employmentTypes,
      workModes: a.workModes,
      availableFrom: toDateOnly(a.availableFrom),
      updatedAt: iso(a.updatedAt),
    },
    privacy: {
      visibility: p.visibility,
      isDiscoverable: p.isDiscoverable,
      showContactEmail: p.showContactEmail,
      showPhoneNumber: p.showPhoneNumber,
      showLocation: p.showLocation,
      showExperience: p.showExperience,
      showEducation: p.showEducation,
      showVerifiedSkills: p.showVerifiedSkills,
      updatedAt: iso(p.updatedAt),
    },
    experiences: row.experiences.map(toExperience),
    education: row.education.map(toEducation),
    certificates: row.certificates.map(toCertificate),
    portfolio: row.portfolioItems.map(toPortfolioItem),
    languages: row.languages.map(toLanguage),
  };
}

export type OwnProfileRecord = ReturnType<typeof toOwnProfile>;

async function findProfileId(db: PrismaClient | Prisma.TransactionClient, userId: string): Promise<string> {
  const profile = await db.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new CandidateDataError("not_found");
  return profile.id;
}

/** Null if the user has no profile yet. */
export async function getOwnProfile(db: PrismaClient, userId: string): Promise<OwnProfileRecord | null> {
  const row = await db.candidateProfile.findUnique({ where: { userId }, include: profileInclude });
  if (!row) return null;
  // Profiles created elsewhere may lack these rows. Their defaults are the most private choice.
  if (!row.availability || !row.privacySettings) {
    await db.candidateAvailability.upsert({ where: { profileId: row.id }, create: { profileId: row.id }, update: {} });
    await db.candidatePrivacySettings.upsert({ where: { profileId: row.id }, create: { profileId: row.id }, update: {} });
    return getOwnProfile(db, userId);
  }
  return toOwnProfile({ ...row, availability: row.availability, privacySettings: row.privacySettings });
}

function audit(tx: Prisma.TransactionClient, userId: string, action: string, profileId: string, metadata?: Prisma.InputJsonObject) {
  return tx.auditLog.create({
    data: { action, actorType: "USER", actorId: userId, targetType: "candidate_profile", targetId: profileId, metadata },
  });
}

/** Creates the profile with private defaults for availability and privacy. One per user. */
export async function createProfile(db: PrismaClient, userId: string, data: ProfileData): Promise<OwnProfileRecord> {
  try {
    await db.$transaction(async (tx) => {
      const profile = await tx.candidateProfile.create({
        data: { userId, ...data, availability: { create: {} }, privacySettings: { create: {} } },
      });
      await audit(tx, userId, "candidate.profile_created", profile.id);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new CandidateDataError("duplicate");
    throw error;
  }
  const created = await getOwnProfile(db, userId);
  if (!created) throw new CandidateDataError("not_found");
  return created;
}

/** Throws `stale` when the row exists but changed since the client read it. */
async function assertUpdated(count: number, exists: () => Promise<unknown>) {
  if (count > 0) return;
  throw new CandidateDataError((await exists()) ? "stale" : "not_found");
}

export async function updateProfile(db: PrismaClient, userId: string, data: ProfileData & Versioned): Promise<OwnProfileRecord> {
  const { expectedUpdatedAt, ...values } = data;
  const { count } = await db.candidateProfile.updateMany({
    where: { userId, updatedAt: new Date(expectedUpdatedAt) },
    data: values,
  });
  await assertUpdated(count, () => db.candidateProfile.findUnique({ where: { userId }, select: { id: true } }));
  return (await getOwnProfile(db, userId)) ?? Promise.reject(new CandidateDataError("not_found"));
}

/**
 * Removes the profile and, by cascade, its experience, education, certificates, portfolio,
 * languages, availability and privacy settings. Skills and verified scores belong to the user,
 * not the profile, and are kept.
 */
export async function deleteProfile(db: PrismaClient, userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const profileId = await findProfileId(tx, userId);
    await tx.candidateProfile.delete({ where: { id: profileId } });
    await audit(tx, userId, "candidate.profile_deleted", profileId);
  });
}

export async function updateAvailability(db: PrismaClient, userId: string, data: AvailabilityData & Versioned): Promise<OwnProfileRecord> {
  const { expectedUpdatedAt, availableFrom, ...values } = data;
  const profileId = await findProfileId(db, userId);
  const { count } = await db.candidateAvailability.updateMany({
    where: { profileId, updatedAt: new Date(expectedUpdatedAt) },
    data: { ...values, availableFrom: fromDateOnly(availableFrom) },
  });
  await assertUpdated(count, () => db.candidateAvailability.findUnique({ where: { profileId }, select: { id: true } }));
  return (await getOwnProfile(db, userId)) ?? Promise.reject(new CandidateDataError("not_found"));
}

const PRIVACY_FIELDS = [
  "visibility",
  "isDiscoverable",
  "showContactEmail",
  "showPhoneNumber",
  "showLocation",
  "showExperience",
  "showEducation",
  "showVerifiedSkills",
] as const satisfies readonly (keyof PrivacyData)[];

/** Privacy changes are audited with the new visibility and the names of the fields changed. */
export async function updatePrivacy(db: PrismaClient, userId: string, data: PrivacyData & Versioned): Promise<OwnProfileRecord> {
  const { expectedUpdatedAt, ...values } = data;
  await db.$transaction(async (tx) => {
    const profileId = await findProfileId(tx, userId);
    const current = await tx.candidatePrivacySettings.findUnique({ where: { profileId } });
    if (!current) throw new CandidateDataError("not_found");
    const { count } = await tx.candidatePrivacySettings.updateMany({
      where: { profileId, updatedAt: new Date(expectedUpdatedAt) },
      data: values,
    });
    if (count === 0) throw new CandidateDataError("stale");
    const changed = PRIVACY_FIELDS.filter((field) => current[field] !== values[field]);
    if (changed.length > 0) {
      await audit(tx, userId, "candidate.privacy_updated", profileId, { visibility: values.visibility, changed });
    }
  });
  return (await getOwnProfile(db, userId)) ?? Promise.reject(new CandidateDataError("not_found"));
}

// ---------------------------------------------------------------------------
// Profile sections
// ---------------------------------------------------------------------------

export interface SectionDataMap {
  experiences: ExperienceData;
  education: EducationData;
  certificates: CertificateData;
  portfolio: PortfolioData;
  languages: LanguageData;
}

export interface SectionUpdateMap {
  experiences: ExperienceData;
  education: EducationData;
  certificates: CertificateData;
  portfolio: PortfolioData;
  languages: Pick<LanguageData, "proficiency">;
}

export interface SectionRecordMap {
  experiences: ReturnType<typeof toExperience>;
  education: ReturnType<typeof toEducation>;
  certificates: ReturnType<typeof toCertificate>;
  portfolio: ReturnType<typeof toPortfolioItem>;
  languages: ReturnType<typeof toLanguage>;
}

export type SectionName = keyof SectionDataMap;

interface Where {
  id: string;
  profileId: string;
}

/** One handler per section: how to count, create, update and delete its rows. */
interface SectionHandler<K extends SectionName> {
  count(tx: Prisma.TransactionClient, profileId: string): Promise<number>;
  create(tx: Prisma.TransactionClient, profileId: string, data: SectionDataMap[K]): Promise<SectionRecordMap[K]>;
  update(tx: Prisma.TransactionClient, where: Where & { updatedAt: Date }, data: SectionUpdateMap[K]): Promise<number>;
  find(tx: Prisma.TransactionClient, where: Where): Promise<SectionRecordMap[K] | null>;
  remove(tx: Prisma.TransactionClient, where: Where): Promise<number>;
}

const experienceValues = (d: ExperienceData) => ({ ...d, startDate: fromDateOnly(d.startDate), endDate: fromDateOnly(d.endDate) });
const educationValues = (d: EducationData) => ({ ...d, startDate: fromDateOnly(d.startDate), endDate: fromDateOnly(d.endDate) });
const certificateValues = (d: CertificateData) => ({ ...d, issuedOn: fromDateOnly(d.issuedOn), expiresOn: fromDateOnly(d.expiresOn) });
const portfolioValues = (d: PortfolioData) => ({ ...d, completedOn: fromDateOnly(d.completedOn) });

const handlers: { [K in SectionName]: SectionHandler<K> } = {
  experiences: {
    count: (tx, profileId) => tx.candidateExperience.count({ where: { profileId } }),
    create: async (tx, profileId, d) => toExperience(await tx.candidateExperience.create({ data: { profileId, ...experienceValues(d) } })),
    update: async (tx, where, d) => (await tx.candidateExperience.updateMany({ where, data: experienceValues(d) })).count,
    find: async (tx, where) => {
      const row = await tx.candidateExperience.findFirst({ where });
      return row && toExperience(row);
    },
    remove: async (tx, where) => (await tx.candidateExperience.deleteMany({ where })).count,
  },
  education: {
    count: (tx, profileId) => tx.candidateEducation.count({ where: { profileId } }),
    create: async (tx, profileId, d) => toEducation(await tx.candidateEducation.create({ data: { profileId, ...educationValues(d) } })),
    update: async (tx, where, d) => (await tx.candidateEducation.updateMany({ where, data: educationValues(d) })).count,
    find: async (tx, where) => {
      const row = await tx.candidateEducation.findFirst({ where });
      return row && toEducation(row);
    },
    remove: async (tx, where) => (await tx.candidateEducation.deleteMany({ where })).count,
  },
  certificates: {
    count: (tx, profileId) => tx.candidateCertificate.count({ where: { profileId } }),
    create: async (tx, profileId, d) => toCertificate(await tx.candidateCertificate.create({ data: { profileId, ...certificateValues(d) } })),
    update: async (tx, where, d) => (await tx.candidateCertificate.updateMany({ where, data: certificateValues(d) })).count,
    find: async (tx, where) => {
      const row = await tx.candidateCertificate.findFirst({ where });
      return row && toCertificate(row);
    },
    remove: async (tx, where) => (await tx.candidateCertificate.deleteMany({ where })).count,
  },
  portfolio: {
    count: (tx, profileId) => tx.candidatePortfolioItem.count({ where: { profileId } }),
    create: async (tx, profileId, d) => toPortfolioItem(await tx.candidatePortfolioItem.create({ data: { profileId, ...portfolioValues(d) } })),
    update: async (tx, where, d) => (await tx.candidatePortfolioItem.updateMany({ where, data: portfolioValues(d) })).count,
    find: async (tx, where) => {
      const row = await tx.candidatePortfolioItem.findFirst({ where });
      return row && toPortfolioItem(row);
    },
    remove: async (tx, where) => (await tx.candidatePortfolioItem.deleteMany({ where })).count,
  },
  languages: {
    count: (tx, profileId) => tx.candidateLanguage.count({ where: { profileId } }),
    create: async (tx, profileId, d) => toLanguage(await tx.candidateLanguage.create({ data: { profileId, ...d } })),
    update: async (tx, where, d) => (await tx.candidateLanguage.updateMany({ where, data: { proficiency: d.proficiency } })).count,
    find: async (tx, where) => {
      const row = await tx.candidateLanguage.findFirst({ where });
      return row && toLanguage(row);
    },
    remove: async (tx, where) => (await tx.candidateLanguage.deleteMany({ where })).count,
  },
};

export async function addSectionItem<K extends SectionName>(db: PrismaClient, userId: string, section: K, data: SectionDataMap[K]): Promise<SectionRecordMap[K]> {
  const handler: SectionHandler<K> = handlers[section];
  try {
    return await db.$transaction(async (tx) => {
      const profileId = await findProfileId(tx, userId);
      if ((await handler.count(tx, profileId)) >= PROFILE_LIMITS[section]) throw new CandidateDataError("limit", section);
      return handler.create(tx, profileId, data);
    });
  } catch (error) {
    // Only languages have a unique key: one entry per language.
    if (isUniqueViolation(error)) throw new CandidateDataError("duplicate", "languageCode");
    throw error;
  }
}

/** The item must belong to this user's profile; any other ID is reported as not found. */
export async function updateSectionItem<K extends SectionName>(
  db: PrismaClient,
  userId: string,
  section: K,
  id: string,
  data: SectionUpdateMap[K],
  expectedUpdatedAt: string,
): Promise<SectionRecordMap[K]> {
  const handler: SectionHandler<K> = handlers[section];
  return db.$transaction(async (tx) => {
    const profileId = await findProfileId(tx, userId);
    const count = await handler.update(tx, { id, profileId, updatedAt: new Date(expectedUpdatedAt) }, data);
    const record = await handler.find(tx, { id, profileId });
    if (!record) throw new CandidateDataError("not_found");
    if (count === 0) throw new CandidateDataError("stale");
    return record;
  });
}

export async function deleteSectionItem(db: PrismaClient, userId: string, section: SectionName, id: string): Promise<void> {
  const handler = handlers[section];
  await db.$transaction(async (tx) => {
    const profileId = await findProfileId(tx, userId);
    if ((await handler.remove(tx, { id, profileId })) === 0) throw new CandidateDataError("not_found");
  });
}
