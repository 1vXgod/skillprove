import type { PrismaClient } from "../generated/prisma/client";
import type { ProfileVisibility } from "../generated/prisma/enums";
import { profileInclude, toCertificate, toEducation, toExperience, toLanguage, toPortfolioItem, type ProfileRow } from "./candidate-profile";
import { toDateOnly } from "./candidate-dates";
import { listSelfReportedSkills, type SkillLocale } from "./skills";
import { listVerifiedSkills } from "./skill-passport";

/**
 * Who is looking, as far as candidate privacy is concerned. Derived from the viewer's active
 * memberships in the database, never from the request.
 */
export type ViewerAudience = "AUTHENTICATED" | "COMPANY" | "VERIFIED_COMPANY";

export async function resolveViewerAudience(db: PrismaClient, viewerUserId: string): Promise<ViewerAudience> {
  const memberships = await db.companyMember.findMany({
    where: { userId: viewerUserId, status: "ACTIVE", company: { deletedAt: null } },
    select: { company: { select: { verificationStatus: true } } },
  });
  if (memberships.some((m) => m.company.verificationStatus === "VERIFIED")) return "VERIFIED_COMPANY";
  return memberships.length > 0 ? "COMPANY" : "AUTHENTICATED";
}

/** PRIVATE is seen by nobody else. Each wider setting adds an audience. */
export function audienceCanView(visibility: ProfileVisibility, audience: ViewerAudience): boolean {
  switch (visibility) {
    case "PUBLIC":
      return true;
    case "ALL_COMPANIES":
      return audience === "COMPANY" || audience === "VERIFIED_COMPANY";
    case "VERIFIED_COMPANIES":
      return audience === "VERIFIED_COMPANY";
    case "PRIVATE":
      return false;
  }
}

type Privacy = NonNullable<ProfileRow["privacySettings"]>;

/**
 * The profile as someone else may see it. Sections the candidate has not opted to show are
 * null. Contact details include links. Certificates follow the education setting. Portfolio
 * items appear only if marked visible. Verified skills omit assessment evidence, which could
 * reveal assessments the viewer's company does not own.
 */
async function buildView(db: PrismaClient, row: ProfileRow, privacy: Privacy, locale: SkillLocale) {
  const [selfReported, verified] = await Promise.all([
    listSelfReportedSkills(db, row.userId, locale),
    privacy.showVerifiedSkills ? listVerifiedSkills(db, row.userId, locale) : Promise.resolve(null),
  ]);
  const showContact = privacy.showContactEmail || privacy.showPhoneNumber;
  const availability = row.availability;
  const strip = <T extends { updatedAt: string }>({ updatedAt: _updatedAt, ...rest }: T) => rest;

  return {
    id: row.id,
    fullName: row.fullName,
    headline: row.headline,
    biography: row.biography,
    interests: row.interests,
    location: privacy.showLocation ? { city: row.city, countryCode: row.countryCode } : null,
    contact: showContact
      ? {
          email: privacy.showContactEmail ? row.contactEmail : null,
          phoneNumber: privacy.showPhoneNumber ? row.phoneNumber : null,
          linkedinUrl: privacy.showContactEmail ? row.linkedinUrl : null,
          githubUrl: privacy.showContactEmail ? row.githubUrl : null,
          websiteUrl: privacy.showContactEmail ? row.websiteUrl : null,
        }
      : null,
    availability: {
      status: availability?.status ?? "NOT_LOOKING",
      employmentTypes: availability?.employmentTypes ?? [],
      workModes: availability?.workModes ?? [],
      availableFrom: toDateOnly(availability?.availableFrom ?? null),
    },
    languages: row.languages.map(toLanguage).map(({ languageCode, proficiency }) => ({ languageCode, proficiency })),
    experiences: privacy.showExperience ? row.experiences.map(toExperience).map(strip) : null,
    education: privacy.showEducation ? row.education.map(toEducation).map(strip) : null,
    certificates: privacy.showEducation
      ? row.certificates.map(toCertificate).map(({ updatedAt: _u, hasDocument: _d, ...rest }) => rest)
      : null,
    portfolio: row.portfolioItems
      .filter((item) => item.isVisible)
      .map(toPortfolioItem)
      .map(({ updatedAt: _u, isVisible: _v, hasDocument: _d, ...rest }) => rest),
    selfReportedSkills: selfReported.map(strip),
    verifiedSkills: verified
      ? verified.map(({ formulaVersion: _f, evidence: _e, ...rest }) => rest)
      : null,
  };
}

export type CandidateViewRecord = Awaited<ReturnType<typeof buildView>>;

/**
 * Null whenever the viewer may not see the profile, including when it does not exist or its
 * owner's account is not active, so the response never reveals which case it was.
 */
export async function getCandidateView(db: PrismaClient, profileId: string, viewerUserId: string, locale: SkillLocale): Promise<CandidateViewRecord | null> {
  const row = await db.candidateProfile.findFirst({
    where: { id: profileId, user: { status: "ACTIVE" } },
    include: profileInclude,
  });
  if (!row?.privacySettings) return null;
  if (row.userId !== viewerUserId) {
    const audience = await resolveViewerAudience(db, viewerUserId);
    if (!audienceCanView(row.privacySettings.visibility, audience)) return null;
  }
  return buildView(db, row, row.privacySettings, locale);
}

/** What a verified company would see, so the candidate can check their settings. */
export async function getProfilePreview(db: PrismaClient, userId: string, locale: SkillLocale) {
  const row = await db.candidateProfile.findUnique({ where: { userId }, include: profileInclude });
  if (!row?.privacySettings) return null;
  return { visibility: row.privacySettings.visibility, view: await buildView(db, row, row.privacySettings, locale) };
}
