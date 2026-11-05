/**
 * Candidate profile vocabularies. They mirror the database enums, so web, mobile and the API
 * use one definition. Labels live in the i18n messages under the same names.
 */

export const LANGUAGE_PROFICIENCIES = ["A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"] as const;
export type LanguageProficiency = (typeof LANGUAGE_PROFICIENCIES)[number];

/** ISO 639-1 codes offered in the language picker, most relevant to Kosovo first. */
export const PROFILE_LANGUAGE_CODES = ["sq", "en", "de", "it", "fr", "tr", "sr", "mk", "hr", "bs", "el", "es", "ro", "nl", "sv", "ar"] as const;
export type ProfileLanguageCode = (typeof PROFILE_LANGUAGE_CODES)[number];

/** ISO 3166 codes offered for a profile's country: Kosovo, the region, and the main diaspora countries. */
export const PROFILE_COUNTRY_CODES = ["XK", "AL", "MK", "ME", "RS", "DE", "CH", "AT", "IT", "FR", "BE", "NL", "SE", "GB", "US"] as const;
export type ProfileCountryCode = (typeof PROFILE_COUNTRY_CODES)[number];

export const SELF_REPORTED_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type SelfReportedLevel = (typeof SELF_REPORTED_LEVELS)[number];

export const AVAILABILITY_STATUSES = ["NOT_LOOKING", "OPEN_TO_OFFERS", "ACTIVELY_LOOKING"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "INTERNSHIP"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

/** Who may see a profile, from most to least private. */
export const PROFILE_VISIBILITIES = ["PRIVATE", "VERIFIED_COMPANIES", "ALL_COMPANIES", "PUBLIC"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** The editable lists on a profile. Each is a REST collection under /me/profile. */
export const PROFILE_SECTIONS = ["experiences", "education", "certificates", "portfolio", "languages"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

/** Upper bounds per profile, so a single account cannot grow without limit. */
export const PROFILE_LIMITS = {
  experiences: 50,
  education: 30,
  certificates: 50,
  portfolio: 50,
  languages: 20,
  skills: 100,
  interests: 15,
  technologies: 15,
} as const;

/** Today's date in Kosovo as YYYY-MM-DD, for "not in the future" checks on both platforms. */
export function todayInKosovo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
