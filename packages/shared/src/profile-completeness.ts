/**
 * How complete a candidate's profile is, for the home screens on web and mobile. Every item
 * counts the same. The order is the order we suggest them in, most useful to companies first,
 * so `next` is the one thing to ask for. Pure: the profile and the number of skills on the
 * Skill Passport (self-reported or verified) are passed in.
 */
export const PROFILE_COMPLETENESS_ITEMS = ["profile", "headline", "skills", "experience", "biography", "location", "education", "languages", "preferences"] as const;
export type ProfileCompletenessItem = (typeof PROFILE_COMPLETENESS_ITEMS)[number];

/** The parts of an own profile this needs, so this package stays free of the validation schemas. */
export interface CompletenessProfile {
  headline: string | null;
  biography: string | null;
  city: string | null;
  experiences: readonly unknown[];
  education: readonly unknown[];
  languages: readonly unknown[];
  availability: { employmentTypes: readonly string[]; workModes: readonly string[] };
}

export interface ProfileCompleteness {
  /** 0–100, rounded. */
  percent: number;
  done: ProfileCompletenessItem[];
  missing: ProfileCompletenessItem[];
  /** The first missing item in suggestion order, or null when the profile is complete. */
  next: ProfileCompletenessItem | null;
}

const filled = (text: string | null) => (text ?? "").trim() !== "";

/** `profile` is null when the candidate has not created one yet. */
export function profileCompleteness(profile: CompletenessProfile | null, skillCount: number): ProfileCompleteness {
  const checks: Record<ProfileCompletenessItem, boolean> = {
    profile: profile !== null,
    headline: profile !== null && filled(profile.headline),
    skills: skillCount > 0,
    experience: (profile?.experiences.length ?? 0) > 0,
    biography: profile !== null && filled(profile.biography),
    location: profile !== null && filled(profile.city),
    education: (profile?.education.length ?? 0) > 0,
    languages: (profile?.languages.length ?? 0) > 0,
    preferences: profile !== null && (profile.availability.employmentTypes.length > 0 || profile.availability.workModes.length > 0),
  };
  const done = PROFILE_COMPLETENESS_ITEMS.filter((item) => checks[item]);
  const missing = PROFILE_COMPLETENESS_ITEMS.filter((item) => !checks[item]);
  return { percent: Math.round((done.length / PROFILE_COMPLETENESS_ITEMS.length) * 100), done, missing, next: missing[0] ?? null };
}
