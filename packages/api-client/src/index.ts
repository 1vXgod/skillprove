import { API_BASE_PATH, type ApiErrorCode, type ProfileSection } from "@skillprove/shared";
import {
  apiFailureSchema,
  aiJobSchema,
  apiSuccessSchema,
  assessmentDetailSchema,
  assessmentListSchema,
  assessmentPreviewSchema,
  attemptResultSchema,
  candidateAttemptSchema,
  takeableAssessmentListSchema,
  generationStartSchema,
  publishResultSchema,
  rubricSchema,
  versionListSchema,
  candidateViewSchema,
  certificateSchema,
  currentUserSchema,
  educationSchema,
  experienceSchema,
  healthSchema,
  languageSchema,
  ownProfileSchema,
  portfolioItemSchema,
  profilePreviewSchema,
  readinessSchema,
  selfReportedSkillSchema,
  skillPassportSchema,
  skillSearchResultSchema,
  VALIDATION_MESSAGES,
  type AiJob,
  type AssessmentDetail,
  type AssessmentList,
  type AssessmentPreview,
  type AttemptAnswers,
  type AttemptResult,
  type CandidateAttempt,
  type TakeableAssessmentList,
  type AssessmentUpdate,
  type AvailabilityInput,
  type GenerationRequest,
  type GenerationStart,
  type ManualAssessmentInput,
  type QuestionContent,
  type Rubric,
  type RubricInput,
  type VersionList,
  type CandidateView,
  type Certificate,
  type CertificateInput,
  type CurrentUser,
  type Education,
  type EducationInput,
  type Experience,
  type ExperienceInput,
  type Health,
  type Language,
  type LanguageInput,
  type PortfolioItem,
  type OwnProfile,
  type PortfolioInput,
  type PrivacyInput,
  type ProfileInput,
  type ProfilePreview,
  type ProfileUpdate,
  type Readiness,
  type SelfReportedSkill,
  type SelfReportedSkillInput,
  type SelfReportedSkillUpdate,
  type SkillPassport,
  type SkillSearchResult,
} from "@skillprove/validation";
import { z } from "zod";

/** `NETWORK_ERROR`, `TIMEOUT` and `INVALID_RESPONSE` originate in the client, never from the API. */
export type ApiClientErrorCode = ApiErrorCode | "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE";

/**
 * How long a request may take, including getting the session token, before it fails with
 * `TIMEOUT`. Every endpoint answers quickly (AI generation runs as a job after the response), so
 * this only ends requests to an API that is unreachable but does not refuse the connection, such
 * as a stopped server behind a tunnel. Without it they would wait forever.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiClientErrorCode,
    message: string,
    readonly status?: number,
    /** Validation message keys per field, when the API rejected the input. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current session token. Called per request, so renewed tokens are picked up. */
  getToken?: () => Promise<string | null>;
  /** Replaceable so tests can run without a server. */
  fetch?: typeof globalThis.fetch;
  /** The app's current language, so skill names come back translated. */
  locale?: "sq" | "en";
  /** Defaults to `REQUEST_TIMEOUT_MS`; replaceable so tests need not wait. */
  timeoutMs?: number;
}

export interface SectionInputs {
  experiences: ExperienceInput;
  education: EducationInput;
  certificates: CertificateInput;
  portfolio: PortfolioInput;
  languages: LanguageInput;
}

export interface SectionUpdates {
  experiences: ExperienceInput;
  education: EducationInput;
  certificates: CertificateInput;
  portfolio: PortfolioInput;
  languages: Pick<LanguageInput, "proficiency">;
}

export interface SectionItems {
  experiences: Experience;
  education: Education;
  certificates: Certificate;
  portfolio: PortfolioItem;
  languages: Language;
}

/** Create, update and delete for one profile section. */
export interface SectionApi<S extends ProfileSection> {
  add(input: SectionInputs[S]): Promise<SectionItems[S]>;
  update(id: string, input: SectionUpdates[S] & { expectedUpdatedAt: string }): Promise<SectionItems[S]>;
  remove(id: string): Promise<void>;
}

const deletedSchema = z.object({ deleted: z.literal(true) });

export interface ApiClient {
  getHealth(): Promise<Health>;
  getReadiness(): Promise<Readiness>;
  getCurrentUser(): Promise<CurrentUser>;

  /** Null when the user has not created a profile yet. */
  getOwnProfile(): Promise<OwnProfile | null>;
  createProfile(input: ProfileInput): Promise<OwnProfile>;
  updateProfile(input: ProfileUpdate): Promise<OwnProfile>;
  deleteProfile(): Promise<void>;
  updateAvailability(input: AvailabilityInput): Promise<OwnProfile>;
  updatePrivacy(input: PrivacyInput): Promise<OwnProfile>;
  getProfilePreview(): Promise<ProfilePreview>;

  sections: { [S in ProfileSection]: SectionApi<S> };

  searchSkills(query: { q?: string; cursor?: string; limit?: number }): Promise<SkillSearchResult>;
  addSelfReportedSkill(input: SelfReportedSkillInput): Promise<SelfReportedSkill>;
  updateSelfReportedSkill(skillId: string, input: SelfReportedSkillUpdate): Promise<SelfReportedSkill>;
  removeSelfReportedSkill(skillId: string): Promise<void>;
  getSkillPassport(): Promise<SkillPassport>;

  getCandidate(profileId: string): Promise<CandidateView>;

  // Taking assessments (candidates). Scores are computed on the server from stored answers;
  // nothing here can send one.
  listTakeableAssessments(): Promise<TakeableAssessmentList>;
  /** Starts an attempt, or returns the one already in progress, so a double tap uses no extra attempt. */
  startAttempt(assessmentId: string): Promise<CandidateAttempt>;
  getAttempt(attemptId: string): Promise<CandidateAttempt>;
  submitAttempt(attemptId: string, answers: AttemptAnswers): Promise<CandidateAttempt>;
  /** `pending` until scored; poll until `scored` or `failed`. */
  getAttemptResult(attemptId: string): Promise<AttemptResult>;

  // Assessments (company members). The AI provider key never reaches clients: generation is a job.
  listAssessments(companyId: string, query?: { page?: number; pageSize?: number; status?: string }): Promise<AssessmentList>;
  createAssessment(companyId: string, input: ManualAssessmentInput): Promise<AssessmentDetail>;
  startGeneration(companyId: string, input: GenerationRequest, idempotencyKey?: string): Promise<GenerationStart>;
  getAssessment(id: string): Promise<AssessmentDetail>;
  updateAssessment(id: string, input: AssessmentUpdate): Promise<AssessmentDetail>;
  deleteAssessment(id: string): Promise<void>;
  createDraft(id: string): Promise<AssessmentDetail>;
  getAssessmentPreview(id: string): Promise<AssessmentPreview>;
  addQuestion(id: string, question: QuestionContent): Promise<AssessmentDetail>;
  updateQuestion(id: string, questionId: string, question: QuestionContent): Promise<AssessmentDetail>;
  removeQuestion(id: string, questionId: string): Promise<AssessmentDetail>;
  reorderQuestions(id: string, questionIds: string[]): Promise<AssessmentDetail>;
  regenerateQuestion(id: string, questionId: string, additionalInstructions?: string | null, idempotencyKey?: string): Promise<GenerationStart>;
  getRubric(id: string): Promise<Rubric | null>;
  updateRubric(id: string, input: RubricInput): Promise<Rubric | null>;
  listVersions(id: string): Promise<VersionList>;
  publishAssessment(id: string): Promise<{ versionId: string; version: number }>;
  restoreVersion(id: string, versionId: string): Promise<AssessmentDetail>;
  getJob(jobId: string): Promise<AiJob>;
  retryJob(jobId: string): Promise<AiJob>;
  cancelJob(jobId: string): Promise<AiJob>;
}

type RequestOptions = { authenticated?: boolean; body?: unknown; query?: Record<string, string | number | undefined>; headers?: Record<string, string> };

export function createApiClient({ baseUrl, getToken, fetch: fetchFn, locale, timeoutMs = REQUEST_TIMEOUT_MS }: ApiClientOptions): ApiClient {
  const root = baseUrl.replace(/\/+$/, "");

  /** Fails with `TIMEOUT` if the whole request (token, response and body) takes too long. */
  async function request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ApiClientError("TIMEOUT", "The API did not respond in time."));
      }, timeoutMs);
    });
    try {
      return await Promise.race([perform(method, path, schema, options, controller.signal), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function perform<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, schema: z.ZodType<T>, options: RequestOptions, signal: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.authenticated) {
      const token = await getToken?.();
      if (!token) throw new ApiClientError("UNAUTHENTICATED", "You are not signed in.");
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    Object.assign(headers, options.headers);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ locale, ...options.query })) {
      if (value !== undefined && String(value) !== "") params.set(key, String(value));
    }
    const search = params.size > 0 ? `?${params.toString()}` : "";

    let response: Response;
    try {
      response = await (fetchFn ?? globalThis.fetch)(`${root}${API_BASE_PATH}${path}${search}`, {
        method,
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal,
      });
    } catch {
      throw new ApiClientError("NETWORK_ERROR", "The API could not be reached.");
    }

    const body: unknown = await response.json().catch(() => undefined);

    const failure = apiFailureSchema.safeParse(body);
    if (failure.success) {
      const { code, message, fields } = failure.data.error;
      throw new ApiClientError(code, message, response.status, fields);
    }

    const success = apiSuccessSchema(schema).safeParse(body);
    if (!response.ok || !success.success) {
      throw new ApiClientError("INVALID_RESPONSE", "The API returned an unexpected response.", response.status);
    }
    return success.data.data;
  }

  const get = <T>(path: string, schema: z.ZodType<T>, authenticated = false, query?: Record<string, string | number | undefined>) =>
    request("GET", path, schema, { authenticated, query });
  const send = <T>(method: "POST" | "PUT", path: string, schema: z.ZodType<T>, body: unknown) =>
    request(method, path, schema, { authenticated: true, body });
  const remove = async (path: string) => {
    await request("DELETE", path, deletedSchema, { authenticated: true });
  };
  const segment = encodeURIComponent;

  function sectionApi<S extends ProfileSection>(section: S, schema: z.ZodType<SectionItems[S]>): SectionApi<S> {
    return {
      add: (input) => send("POST", `/me/profile/${section}`, schema, input),
      update: (id, input) => send("PUT", `/me/profile/${section}/${segment(id)}`, schema, input),
      remove: (id) => remove(`/me/profile/${section}/${segment(id)}`),
    };
  }

  return {
    getHealth: () => get("/health", healthSchema),
    getReadiness: () => get("/health/ready", readinessSchema),
    getCurrentUser: () => get("/me", currentUserSchema, true),

    getOwnProfile: async () => {
      try {
        return await get("/me/profile", ownProfileSchema, true);
      } catch (error) {
        if (error instanceof ApiClientError && error.code === "NOT_FOUND") return null;
        throw error;
      }
    },
    createProfile: (input) => send("POST", "/me/profile", ownProfileSchema, input),
    updateProfile: (input) => send("PUT", "/me/profile", ownProfileSchema, input),
    deleteProfile: () => remove("/me/profile"),
    updateAvailability: (input) => send("PUT", "/me/profile/availability", ownProfileSchema, input),
    updatePrivacy: (input) => send("PUT", "/me/profile/privacy", ownProfileSchema, input),
    getProfilePreview: () => get("/me/profile/preview", profilePreviewSchema, true),

    sections: {
      experiences: sectionApi("experiences", experienceSchema),
      education: sectionApi("education", educationSchema),
      certificates: sectionApi("certificates", certificateSchema),
      portfolio: sectionApi("portfolio", portfolioItemSchema),
      languages: sectionApi("languages", languageSchema),
    },

    searchSkills: (query) => get("/skills", skillSearchResultSchema, true, query),
    addSelfReportedSkill: (input) => send("POST", "/me/skills", selfReportedSkillSchema, input),
    updateSelfReportedSkill: (skillId, input) => send("PUT", `/me/skills/${segment(skillId)}`, selfReportedSkillSchema, input),
    removeSelfReportedSkill: (skillId) => remove(`/me/skills/${segment(skillId)}`),
    getSkillPassport: () => get("/me/skill-passport", skillPassportSchema, true),

    getCandidate: (profileId) => get(`/candidates/${segment(profileId)}`, candidateViewSchema, true),

    listTakeableAssessments: () => get("/me/assessments", takeableAssessmentListSchema, true),
    startAttempt: (assessmentId) => send("POST", `/me/assessments/${segment(assessmentId)}/attempts`, candidateAttemptSchema, undefined),
    getAttempt: (attemptId) => get(`/me/attempts/${segment(attemptId)}`, candidateAttemptSchema, true),
    submitAttempt: (attemptId, answers) => send("POST", `/me/attempts/${segment(attemptId)}/submit`, candidateAttemptSchema, { answers }),
    getAttemptResult: (attemptId) => get(`/me/attempts/${segment(attemptId)}/result`, attemptResultSchema, true),

    listAssessments: (companyId, query) => get(`/companies/${segment(companyId)}/assessments`, assessmentListSchema, true, query),
    createAssessment: (companyId, input) => send("POST", `/companies/${segment(companyId)}/assessments`, assessmentDetailSchema, input),
    startGeneration: (companyId, input, idempotencyKey) =>
      request("POST", `/companies/${segment(companyId)}/assessments/generate`, generationStartSchema, {
        authenticated: true,
        body: input,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      }),
    getAssessment: (id) => get(`/assessments/${segment(id)}`, assessmentDetailSchema, true),
    updateAssessment: (id, input) => send("PUT", `/assessments/${segment(id)}`, assessmentDetailSchema, input),
    deleteAssessment: (id) => remove(`/assessments/${segment(id)}`),
    createDraft: (id) => send("POST", `/assessments/${segment(id)}/draft`, assessmentDetailSchema, undefined),
    getAssessmentPreview: (id) => get(`/assessments/${segment(id)}/preview`, assessmentPreviewSchema, true),
    addQuestion: (id, question) => send("POST", `/assessments/${segment(id)}/questions`, assessmentDetailSchema, question),
    updateQuestion: (id, questionId, question) =>
      send("PUT", `/assessments/${segment(id)}/questions/${segment(questionId)}`, assessmentDetailSchema, question),
    removeQuestion: (id, questionId) =>
      request("DELETE", `/assessments/${segment(id)}/questions/${segment(questionId)}`, assessmentDetailSchema, { authenticated: true }),
    reorderQuestions: (id, questionIds) => send("PUT", `/assessments/${segment(id)}/questions/reorder`, assessmentDetailSchema, { questionIds }),
    regenerateQuestion: (id, questionId, additionalInstructions, idempotencyKey) =>
      request("POST", `/assessments/${segment(id)}/questions/${segment(questionId)}/regenerate`, generationStartSchema, {
        authenticated: true,
        body: { additionalInstructions: additionalInstructions ?? null },
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      }),
    getRubric: (id) => get(`/assessments/${segment(id)}/rubric`, rubricSchema.nullable(), true),
    updateRubric: (id, input) => send("PUT", `/assessments/${segment(id)}/rubric`, rubricSchema.nullable(), input),
    listVersions: (id) => get(`/assessments/${segment(id)}/versions`, versionListSchema, true),
    publishAssessment: (id) => send("POST", `/assessments/${segment(id)}/publish`, publishResultSchema, undefined),
    restoreVersion: (id, versionId) =>
      send("POST", `/assessments/${segment(id)}/versions/${segment(versionId)}/restore`, assessmentDetailSchema, undefined),
    getJob: (jobId) => get(`/ai/jobs/${segment(jobId)}`, aiJobSchema, true),
    retryJob: (jobId) => send("POST", `/ai/jobs/${segment(jobId)}/retry`, aiJobSchema, undefined),
    cancelJob: (jobId) => send("POST", `/ai/jobs/${segment(jobId)}/cancel`, aiJobSchema, undefined),
  };
}

const VALIDATION_KEYS = VALIDATION_MESSAGES;
export type ValidationMessageKey = `validation.${(typeof VALIDATION_KEYS)[number]}`;
export type ErrorMessageKey =
  | ValidationMessageKey
  | "errors.conflict"
  | "errors.network"
  | "errors.generic"
  | "errors.rateLimited"
  | "errors.aiUnavailable"
  | "errors.profileRequired"
  | "errors.attemptsExhausted"
  | "errors.attemptExpired"
  | "errors.retriesExhausted";

/** The translation key for a field's validation code, or undefined for anything unrecognised. */
export function validationMessageKey(code: string | undefined): ValidationMessageKey | undefined {
  const known = VALIDATION_KEYS.find((key) => key === code);
  return known ? `validation.${known}` : undefined;
}

/**
 * The translation key for a failed request, shared by web and mobile so both say the same
 * thing. Field errors belong on their fields; this is the message for the form as a whole.
 */
export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!(error instanceof ApiClientError)) return "errors.generic";
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return "errors.network";
  if (error.code === "RATE_LIMITED") return "errors.rateLimited";
  if (error.code === "SERVICE_UNAVAILABLE") return "errors.aiUnavailable";
  if (error.code === "PROFILE_REQUIRED") return "errors.profileRequired";
  if (error.code === "ATTEMPTS_EXHAUSTED") return "errors.attemptsExhausted";
  if (error.code === "ATTEMPT_EXPIRED") return "errors.attemptExpired";
  if (error.code === "RETRIES_EXHAUSTED") return "errors.retriesExhausted";
  if (error.code === "CONFLICT" && !error.fields) return "errors.conflict";
  if (error.code === "CONFLICT" || error.code === "BAD_REQUEST") {
    return validationMessageKey(Object.values(error.fields ?? {})[0]) ?? "errors.generic";
  }
  return "errors.generic";
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  return error instanceof ApiClientError ? (error.fields ?? {}) : {};
}
