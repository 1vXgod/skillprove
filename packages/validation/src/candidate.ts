import {
  AVAILABILITY_STATUSES,
  DIFFICULTY_LEVELS,
  EMPLOYMENT_TYPES,
  LANGUAGE_PROFICIENCIES,
  PROFILE_COUNTRY_CODES,
  PROFILE_LANGUAGE_CODES,
  PROFILE_LIMITS,
  PROFILE_VISIBILITIES,
  SELF_REPORTED_LEVELS,
  todayInKosovo,
  WORK_MODES,
} from "@skillprove/shared";
import { z } from "zod";

/**
 * Messages are i18n keys under "validation.", so web and mobile show the same translated text.
 * The API sends them back per field, and clients look them up.
 */
export const VALIDATION_MESSAGES = [
  "required",
  "tooLong",
  "tooMany",
  "duplicate",
  "invalidUrl",
  "invalidEmail",
  "invalidPhone",
  "invalidDate",
  "invalidNumber",
  "dateInFuture",
  "endBeforeStart",
  "endDateRequired",
  "currentHasEndDate",
  "invalidChoice",
  "weightsMustTotal100",
  "needsCorrectAnswer",
  "duplicateKey",
] as const;
export type ValidationMessage = (typeof VALIDATION_MESSAGES)[number];

const msg = (key: ValidationMessage) => key;

const requiredText = (max: number) => z.string(msg("required")).trim().min(1, msg("required")).max(max, msg("tooLong"));

/** Optional text: blank becomes null, so clients can send form values as they are. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, msg("tooLong"))
    .nullish()
    .transform((value) => (value ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(300, msg("tooLong"))
  .nullish()
  .transform((value) => (value ? value : null))
  // http(s) only, with a host: rules out javascript:, data: and bare paths.
  .refine((value) => value === null || /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?([/?#]\S*)?$/i.test(value), msg("invalidUrl"));

const optionalEmail = z
  .string()
  .trim()
  .max(254, msg("tooLong"))
  .nullish()
  .transform((value) => (value ? value.toLowerCase() : null))
  .refine((value) => value === null || z.email().safeParse(value).success, msg("invalidEmail"));

/** E.164, the format the database requires: +38344123456. Spaces are removed first. */
const optionalPhone = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value.replace(/[\s-]/g, "") : null))
  .refine((value) => value === null || /^\+[1-9][0-9]{6,14}$/.test(value), msg("invalidPhone"));

const isoDate = z.iso.date(msg("invalidDate"));
const optionalDate = isoDate.nullish().transform((value) => value ?? null);

const textList = (maxItems: number) =>
  z
    .array(requiredText(40))
    .max(maxItems, msg("tooMany"))
    .default([])
    .refine((items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length, msg("duplicate"));

function uniqueEnumList<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .array(z.enum(values, msg("invalidChoice")))
    .default([])
    .refine((items) => new Set(items).size === items.length, msg("duplicate"));
}

/** A timestamp the client last saw. Updates are refused if the record changed since. */
const expectedUpdatedAt = z.iso.datetime({ offset: true, message: msg("invalidDate") });

const notInFuture = (date: string | null) => date === null || date <= todayInKosovo();

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const profileInputSchema = z.object({
  fullName: requiredText(120),
  headline: optionalText(120),
  biography: optionalText(2000),
  city: optionalText(80),
  countryCode: z.enum(PROFILE_COUNTRY_CODES, msg("invalidChoice")).default("XK"),
  phoneNumber: optionalPhone,
  contactEmail: optionalEmail,
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  websiteUrl: optionalUrl,
  interests: textList(PROFILE_LIMITS.interests),
});
export const profileUpdateSchema = profileInputSchema.extend({ expectedUpdatedAt });

export const availabilityInputSchema = z.object({
  status: z.enum(AVAILABILITY_STATUSES, msg("invalidChoice")),
  employmentTypes: uniqueEnumList(EMPLOYMENT_TYPES),
  workModes: uniqueEnumList(WORK_MODES),
  availableFrom: optionalDate,
  expectedUpdatedAt,
});

export const privacyInputSchema = z.object({
  visibility: z.enum(PROFILE_VISIBILITIES, msg("invalidChoice")),
  isDiscoverable: z.boolean(),
  showContactEmail: z.boolean(),
  showPhoneNumber: z.boolean(),
  showLocation: z.boolean(),
  showExperience: z.boolean(),
  showEducation: z.boolean(),
  showVerifiedSkills: z.boolean(),
  expectedUpdatedAt,
});

export const experienceInputSchema = z
  .object({
    title: requiredText(120),
    companyName: requiredText(120),
    employmentType: z.enum(EMPLOYMENT_TYPES, msg("invalidChoice")).nullish().transform((v) => v ?? null),
    location: optionalText(120),
    description: optionalText(2000),
    startDate: isoDate,
    endDate: optionalDate,
    isCurrent: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (!notInFuture(value.startDate)) ctx.addIssue({ code: "custom", path: ["startDate"], message: msg("dateInFuture") });
    if (value.isCurrent && value.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("currentHasEndDate") });
    if (!value.isCurrent && !value.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("endDateRequired") });
    if (value.endDate && value.endDate < value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("endBeforeStart") });
    if (!notInFuture(value.endDate)) ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("dateInFuture") });
  });

export const educationInputSchema = z
  .object({
    institution: requiredText(160),
    degree: optionalText(120),
    fieldOfStudy: optionalText(120),
    description: optionalText(2000),
    startDate: optionalDate,
    /** May be in the future: an expected graduation date. */
    endDate: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (!notInFuture(value.startDate)) ctx.addIssue({ code: "custom", path: ["startDate"], message: msg("dateInFuture") });
    if (value.startDate && value.endDate && value.endDate < value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("endBeforeStart") });
  });

export const certificateInputSchema = z
  .object({
    name: requiredText(160),
    issuer: optionalText(160),
    credentialId: optionalText(100),
    credentialUrl: optionalUrl,
    issuedOn: optionalDate,
    expiresOn: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (!notInFuture(value.issuedOn)) ctx.addIssue({ code: "custom", path: ["issuedOn"], message: msg("dateInFuture") });
    if (value.issuedOn && value.expiresOn && value.expiresOn < value.issuedOn) ctx.addIssue({ code: "custom", path: ["expiresOn"], message: msg("endBeforeStart") });
  });

export const portfolioInputSchema = z
  .object({
    title: requiredText(160),
    description: optionalText(2000),
    technologies: textList(PROFILE_LIMITS.technologies),
    projectUrl: optionalUrl,
    repositoryUrl: optionalUrl,
    completedOn: optionalDate,
    isVisible: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (!notInFuture(value.completedOn)) ctx.addIssue({ code: "custom", path: ["completedOn"], message: msg("dateInFuture") });
  });

export const languageInputSchema = z.object({
  languageCode: z.enum(PROFILE_LANGUAGE_CODES, msg("invalidChoice")),
  proficiency: z.enum(LANGUAGE_PROFICIENCIES, msg("invalidChoice")),
});

export const selfReportedSkillInputSchema = z.object({
  skillId: z.uuid(msg("invalidChoice")),
  level: z.enum(SELF_REPORTED_LEVELS, msg("invalidChoice")),
  yearsOfExperience: z
    .number(msg("invalidNumber"))
    .min(0, msg("invalidNumber"))
    .max(60, msg("invalidNumber"))
    .multipleOf(0.5, msg("invalidNumber"))
    .nullish()
    .transform((v) => v ?? null),
});
export const selfReportedSkillUpdateSchema = selfReportedSkillInputSchema.omit({ skillId: true }).extend({ expectedUpdatedAt });

/** Update bodies: the full record plus the version the client edited. */
export const sectionUpdateSchemas = {
  experiences: experienceInputSchema.and(z.object({ expectedUpdatedAt })),
  education: educationInputSchema.and(z.object({ expectedUpdatedAt })),
  certificates: certificateInputSchema.and(z.object({ expectedUpdatedAt })),
  portfolio: portfolioInputSchema.and(z.object({ expectedUpdatedAt })),
  languages: languageInputSchema.pick({ proficiency: true }).extend({ expectedUpdatedAt }),
} as const;

export const sectionCreateSchemas = {
  experiences: experienceInputSchema,
  education: educationInputSchema,
  certificates: certificateInputSchema,
  portfolio: portfolioInputSchema,
  languages: languageInputSchema,
} as const;

export const skillSearchQuerySchema = z.object({
  q: z.string().trim().max(60).default(""),
  locale: z.enum(["sq", "en"]).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const timestamp = z.iso.datetime({ offset: true });

export const experienceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  companyName: z.string(),
  employmentType: z.enum(EMPLOYMENT_TYPES).nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  startDate: isoDate,
  endDate: isoDate.nullable(),
  isCurrent: z.boolean(),
  updatedAt: timestamp,
});

export const educationSchema = z.object({
  id: z.uuid(),
  institution: z.string(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  description: z.string().nullable(),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  updatedAt: timestamp,
});

export const certificateSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  issuer: z.string().nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.string().nullable(),
  issuedOn: isoDate.nullable(),
  expiresOn: isoDate.nullable(),
  /** Whether a document is attached. The file itself is never linked from here. */
  hasDocument: z.boolean(),
  updatedAt: timestamp,
});

export const portfolioItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  technologies: z.array(z.string()),
  projectUrl: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  completedOn: isoDate.nullable(),
  isVisible: z.boolean(),
  hasDocument: z.boolean(),
  updatedAt: timestamp,
});

export const languageSchema = z.object({
  id: z.uuid(),
  languageCode: z.string(),
  proficiency: z.enum(LANGUAGE_PROFICIENCIES),
  updatedAt: timestamp,
});

export const availabilitySchema = z.object({
  status: z.enum(AVAILABILITY_STATUSES),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)),
  workModes: z.array(z.enum(WORK_MODES)),
  availableFrom: isoDate.nullable(),
  updatedAt: timestamp,
});

export const privacySchema = z.object({
  visibility: z.enum(PROFILE_VISIBILITIES),
  isDiscoverable: z.boolean(),
  showContactEmail: z.boolean(),
  showPhoneNumber: z.boolean(),
  showLocation: z.boolean(),
  showExperience: z.boolean(),
  showEducation: z.boolean(),
  showVerifiedSkills: z.boolean(),
  updatedAt: timestamp,
});

/** The candidate's own profile, with everything they entered. */
export const ownProfileSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  headline: z.string().nullable(),
  biography: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string(),
  phoneNumber: z.string().nullable(),
  contactEmail: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  interests: z.array(z.string()),
  createdAt: timestamp,
  updatedAt: timestamp,
  availability: availabilitySchema,
  privacy: privacySchema,
  experiences: z.array(experienceSchema),
  education: z.array(educationSchema),
  certificates: z.array(certificateSchema),
  portfolio: z.array(portfolioItemSchema),
  languages: z.array(languageSchema),
});

export const skillRefSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string() });

export const skillSearchResultSchema = z.object({
  items: z.array(skillRefSchema.extend({ category: z.string() })),
  nextCursor: z.string().nullable(),
});

export const selfReportedSkillSchema = z.object({
  skill: skillRefSchema,
  level: z.enum(SELF_REPORTED_LEVELS),
  yearsOfExperience: z.number().nullable(),
  updatedAt: timestamp,
});

/** CURRENT, or OUTDATED when an evaluation behind it was later superseded or rejected in review. */
export const EVIDENCE_STATUSES = ["CURRENT", "OUTDATED"] as const;

export const verifiedSkillSchema = z.object({
  skill: skillRefSchema,
  score: z.number(),
  confidence: z.number(),
  assessmentCount: z.number().int(),
  highestDifficulty: z.enum(DIFFICULTY_LEVELS),
  lastVerifiedAt: timestamp,
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
});

export const verifiedSkillWithEvidenceSchema = verifiedSkillSchema.extend({
  formulaVersion: z.string(),
  evidence: z.array(
    z.object({
      evaluationId: z.uuid(),
      assessmentTitle: z.string(),
      completedAt: timestamp.nullable(),
      reviewStatus: z.enum(["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"]),
      superseded: z.boolean(),
    }),
  ),
});

export const skillInAssessmentSchema = z.object({
  skill: skillRefSchema,
  attempts: z.array(
    z.object({
      attemptId: z.uuid(),
      assessmentTitle: z.string(),
      /** IN_PROGRESS: still being taken. AWAITING_EVALUATION: submitted, no completed evaluation yet. */
      stage: z.enum(["IN_PROGRESS", "AWAITING_EVALUATION"]),
      startedAt: timestamp,
      submittedAt: timestamp.nullable(),
    }),
  ),
});

export const skillPassportSchema = z.object({
  verified: z.array(verifiedSkillWithEvidenceSchema),
  inAssessment: z.array(skillInAssessmentSchema),
  selfReported: z.array(selfReportedSkillSchema),
});

/** What someone other than the candidate may see. Hidden sections are null, not empty. */
export const candidateViewSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  headline: z.string().nullable(),
  biography: z.string().nullable(),
  interests: z.array(z.string()),
  location: z.object({ city: z.string().nullable(), countryCode: z.string() }).nullable(),
  contact: z
    .object({
      email: z.string().nullable(),
      phoneNumber: z.string().nullable(),
      linkedinUrl: z.string().nullable(),
      githubUrl: z.string().nullable(),
      websiteUrl: z.string().nullable(),
    })
    .nullable(),
  availability: availabilitySchema.omit({ updatedAt: true }),
  languages: z.array(languageSchema.omit({ id: true, updatedAt: true })),
  experiences: z.array(experienceSchema.omit({ updatedAt: true })).nullable(),
  education: z.array(educationSchema.omit({ updatedAt: true })).nullable(),
  certificates: z.array(certificateSchema.omit({ updatedAt: true, hasDocument: true })).nullable(),
  portfolio: z.array(portfolioItemSchema.omit({ updatedAt: true, isVisible: true, hasDocument: true })),
  selfReportedSkills: z.array(selfReportedSkillSchema.omit({ updatedAt: true })),
  verifiedSkills: z.array(verifiedSkillSchema).nullable(),
});

export const profilePreviewSchema = z.object({
  visibility: z.enum(PROFILE_VISIBILITIES),
  view: candidateViewSchema,
});

export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileUpdate = z.input<typeof profileUpdateSchema>;
export type AvailabilityInput = z.input<typeof availabilityInputSchema>;
export type PrivacyInput = z.input<typeof privacyInputSchema>;
export type ExperienceInput = z.input<typeof experienceInputSchema>;
export type EducationInput = z.input<typeof educationInputSchema>;
export type CertificateInput = z.input<typeof certificateInputSchema>;
export type PortfolioInput = z.input<typeof portfolioInputSchema>;
export type LanguageInput = z.input<typeof languageInputSchema>;
export type SelfReportedSkillInput = z.input<typeof selfReportedSkillInputSchema>;
export type SelfReportedSkillUpdate = z.input<typeof selfReportedSkillUpdateSchema>;

export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certificate = z.infer<typeof certificateSchema>;
export type PortfolioItem = z.infer<typeof portfolioItemSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type Privacy = z.infer<typeof privacySchema>;
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export type SkillRef = z.infer<typeof skillRefSchema>;
export type SkillSearchResult = z.infer<typeof skillSearchResultSchema>;
export type SelfReportedSkill = z.infer<typeof selfReportedSkillSchema>;
export type VerifiedSkill = z.infer<typeof verifiedSkillSchema>;
export type VerifiedSkillWithEvidence = z.infer<typeof verifiedSkillWithEvidenceSchema>;
export type SkillInAssessment = z.infer<typeof skillInAssessmentSchema>;
export type SkillPassport = z.infer<typeof skillPassportSchema>;
export type CandidateView = z.infer<typeof candidateViewSchema>;
export type ProfilePreview = z.infer<typeof profilePreviewSchema>;

/** Field errors from a failed parse, keyed by top-level field: { endDate: "endBeforeStart" }. */
export function fieldErrors(error: z.ZodError): Record<string, ValidationMessage> {
  const result: Record<string, ValidationMessage> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_");
    if (result[field]) continue;
    result[field] = VALIDATION_MESSAGES.find((key) => key === issue.message) ?? "invalidChoice";
  }
  return result;
}
