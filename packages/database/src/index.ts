import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export { Prisma, PrismaClient } from "./generated/prisma/client";
export * from "./generated/prisma/enums";
export {
  findActiveCompanyMembership,
  findActivePlatformAdmin,
  findUserByAuthSubject,
  loadUserAccess,
} from "./repositories/authorization";
export { companyScope, type CompanyScope } from "./repositories/company-scope";
export { CandidateDataError, type CandidateDataErrorReason } from "./repositories/candidate-errors";
export {
  addSectionItem,
  createProfile,
  deleteProfile,
  deleteSectionItem,
  getOwnProfile,
  updateAvailability,
  updatePrivacy,
  updateProfile,
  updateSectionItem,
  type OwnProfileRecord,
  type SectionName,
} from "./repositories/candidate-profile";
export {
  audienceCanView,
  getCandidateView,
  getProfilePreview,
  resolveViewerAudience,
  type CandidateViewRecord,
  type ViewerAudience,
} from "./repositories/candidate-view";
export { getSkillPassport } from "./repositories/skill-passport";
export {
  addSelfReportedSkill,
  removeSelfReportedSkill,
  searchSkills,
  updateSelfReportedSkill,
  type SkillLocale,
} from "./repositories/skills";
export { anonymizeIdentity, syncIdentity, type VerifiedIdentity } from "./repositories/identity";
export {
  recordVerifiedSkillScore,
  recordVerifiedSkillScoreInTransaction,
  type VerifiedSkillScoreInput,
} from "./repositories/verified-skill-scores";
export { seedSkillTaxonomy } from "./seed/skill-taxonomy";

export function createPrismaClient(connectionString: string): PrismaClient {
  // pg waits indefinitely by default, which would hang requests on an unreachable database.
  // 15 seconds covers a Neon compute waking from suspend over a slow network; 5 was too tight.
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 15_000 });
  return new PrismaClient({ adapter });
}

// Kept on globalThis so hot reloads in development do not open a new pool each time.
const store = globalThis as { skillproveDb?: PrismaClient };

/** The process-wide client. Application code uses this; tests create their own. */
export function getSharedPrismaClient(connectionString: string): PrismaClient {
  store.skillproveDb ??= createPrismaClient(connectionString);
  return store.skillproveDb;
}

/** Resolves when the database answers a query. Rejects otherwise. */
export async function checkDatabaseConnection(client: PrismaClient): Promise<void> {
  await client.$queryRaw`SELECT 1`;
}

export { AssessmentDataError, type AssessmentDataErrorReason } from "./repositories/assessment-errors";
export * from "./repositories/assessments";
export * from "./repositories/ai-jobs";
export { AttemptDataError, type AttemptDataErrorReason } from "./repositories/attempt-errors";
export { attemptDeadline, getCandidateAttempt, listTakeableAssessments, startAttempt, DEFAULT_ATTEMPT_HOURS } from "./repositories/attempts";
