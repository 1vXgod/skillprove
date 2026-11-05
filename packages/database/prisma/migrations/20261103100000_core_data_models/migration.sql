-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'CONTENT_REVIEWER');

-- CreateEnum
CREATE TYPE "CompanyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'ADMIN', 'RECRUITER', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CompanyMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'VERIFIED_COMPANIES', 'ALL_COMPANIES', 'PUBLIC');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('NOT_LOOKING', 'OPEN_TO_OFFERS', 'ACTIVELY_LOOKING');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "PayPeriod" AS ENUM ('HOUR', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE');

-- CreateEnum
CREATE TYPE "SelfReportedLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "AssessmentOwnerType" AS ENUM ('PLATFORM', 'COMPANY');

-- CreateEnum
CREATE TYPE "AssessmentCreationSource" AS ENUM ('HUMAN', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "AssessmentVisibility" AS ENUM ('PUBLIC', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "AssessmentFormat" AS ENUM ('MULTIPLE_CHOICE', 'WRITTEN', 'PRACTICAL_TASK', 'CODING', 'FILE_SUBMISSION', 'MIXED');

-- CreateEnum
CREATE TYPE "AssessmentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_TEXT', 'LONG_TEXT', 'CODE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "EvaluatorType" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvaluationReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "AIJobType" AS ENUM ('ASSESSMENT_GENERATION', 'SUBMISSION_EVALUATION');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'PLATFORM_ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMPANY_INVITATION', 'ASSESSMENT_INVITATION', 'EVALUATION_READY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('PROFILE_IMAGE', 'COMPANY_LOGO', 'CERTIFICATE', 'PORTFOLIO', 'SUBMISSION');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING_UPLOAD', 'AVAILABLE', 'QUARANTINED', 'DELETED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_type" "ActorType" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "company_id" UUID,
ADD COLUMN     "request_id" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_subject" TEXT,
    "email" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'sq',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Belgrade',
    "deletion_requested_at" TIMESTAMPTZ(3),
    "anonymized_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "granted_by_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "registration_number" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'XK',
    "website_url" TEXT,
    "description" TEXT,
    "logo_file_id" UUID,
    "verification_status" "CompanyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "status" "CompanyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "removed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_invitations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_id" UUID,
    "accepted_by_id" UUID,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "headline" TEXT,
    "biography" TEXT,
    "profile_image_file_id" UUID,
    "city" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'XK',
    "phone_number" TEXT,
    "contact_email" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "website_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_experiences" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" "EmploymentType",
    "location" TEXT,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_education" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certificates" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "file_id" UUID,
    "issued_on" DATE,
    "expires_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_portfolio_items" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "project_url" TEXT,
    "repository_url" TEXT,
    "file_id" UUID,
    "is_visible" BOOLEAN NOT NULL DEFAULT false,
    "completed_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_availability" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'NOT_LOOKING',
    "employment_types" "EmploymentType"[],
    "work_modes" "WorkMode"[],
    "available_from" DATE,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "salary_currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "salary_period" "PayPeriod" NOT NULL DEFAULT 'MONTH',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_privacy_settings" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "is_discoverable" BOOLEAN NOT NULL DEFAULT false,
    "show_contact_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone_number" BOOLEAN NOT NULL DEFAULT false,
    "show_location" BOOLEAN NOT NULL DEFAULT false,
    "show_experience" BOOLEAN NOT NULL DEFAULT false,
    "show_education" BOOLEAN NOT NULL DEFAULT false,
    "show_verified_skills" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_category_translations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "skill_category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_translations" (
    "id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "skill_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_aliases" (
    "id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "locale" VARCHAR(10),

    CONSTRAINT "skill_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "self_reported_level" "SelfReportedLevel" NOT NULL,
    "years_of_experience" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_skill_scores" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "calculation_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "assessment_count" INTEGER NOT NULL,
    "highest_difficulty" "DifficultyLevel" NOT NULL,
    "last_verified_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verified_skill_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_skill_score_calculations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "assessment_count" INTEGER NOT NULL,
    "highest_difficulty" "DifficultyLevel" NOT NULL,
    "formula_version" TEXT NOT NULL,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_skill_score_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_skill_score_calculation_inputs" (
    "id" UUID NOT NULL,
    "calculation_id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "verified_skill_score_calculation_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "owner_type" "AssessmentOwnerType" NOT NULL,
    "owner_company_id" UUID,
    "creation_source" "AssessmentCreationSource" NOT NULL DEFAULT 'HUMAN',
    "visibility" "AssessmentVisibility" NOT NULL DEFAULT 'INVITE_ONLY',
    "created_by_id" UUID,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_versions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "language" VARCHAR(10) NOT NULL DEFAULT 'sq',
    "format" "AssessmentFormat" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "duration_minutes" INTEGER,
    "max_attempts" INTEGER NOT NULL DEFAULT 1,
    "attempt_ttl_hours" INTEGER,
    "status" "AssessmentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answer_key" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_skills" (
    "id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "assessment_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_rubric_versions" (
    "id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_rubric_criteria" (
    "id" UUID NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "assessment_rubric_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "assessment_version_id" UUID NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "candidate_user_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_submissions" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "responses" JSONB,
    "content_erased_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_submission_files" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "question_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "evaluator_type" "EvaluatorType" NOT NULL,
    "evaluator_user_id" UUID,
    "provider" TEXT,
    "model_name" TEXT,
    "prompt_version" TEXT,
    "ai_job_id" UUID,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "overall_score" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "summary" TEXT,
    "review_status" "EvaluationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "supersedes_evaluation_id" UUID,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criterion_scores" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "evaluation_criterion_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_evidence" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "criterion_score_id" UUID,
    "submission_file_id" UUID,
    "question_id" UUID,
    "excerpt" TEXT,
    "locator" JSONB,
    "content_erased_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_reviews" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "decision" "ReviewDecision" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "type" "AIJobType" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" TEXT,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "requested_by_id" UUID,
    "company_id" UUID,
    "submission_id" UUID,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost" DECIMAL(12,6),
    "cost_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "token_ciphertext" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID,
    "owner_company_id" UUID,
    "purpose" "FilePurpose" NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "storage_provider" TEXT NOT NULL DEFAULT 'r2',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_user_id_key" ON "platform_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_verification_status_idx" ON "companies"("verification_status");

-- CreateIndex
CREATE INDEX "company_members_user_id_idx" ON "company_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_company_id_user_id_key" ON "company_members"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_invitations_token_hash_key" ON "company_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "company_invitations_company_id_status_idx" ON "company_invitations"("company_id", "status");

-- CreateIndex
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");

-- CreateIndex
CREATE INDEX "candidate_profiles_country_code_idx" ON "candidate_profiles"("country_code");

-- CreateIndex
CREATE INDEX "candidate_experiences_profile_id_idx" ON "candidate_experiences"("profile_id");

-- CreateIndex
CREATE INDEX "candidate_education_profile_id_idx" ON "candidate_education"("profile_id");

-- CreateIndex
CREATE INDEX "candidate_certificates_profile_id_idx" ON "candidate_certificates"("profile_id");

-- CreateIndex
CREATE INDEX "candidate_portfolio_items_profile_id_idx" ON "candidate_portfolio_items"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_languages_profile_id_language_code_key" ON "candidate_languages"("profile_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_availability_profile_id_key" ON "candidate_availability"("profile_id");

-- CreateIndex
CREATE INDEX "candidate_availability_status_idx" ON "candidate_availability"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_privacy_settings_profile_id_key" ON "candidate_privacy_settings"("profile_id");

-- CreateIndex
CREATE INDEX "candidate_privacy_settings_is_discoverable_visibility_idx" ON "candidate_privacy_settings"("is_discoverable", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_slug_key" ON "skill_categories"("slug");

-- CreateIndex
CREATE INDEX "skill_categories_parent_id_idx" ON "skill_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_category_translations_category_id_locale_key" ON "skill_category_translations"("category_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_id_idx" ON "skills"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_translations_skill_id_locale_key" ON "skill_translations"("skill_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "skill_aliases_normalized_alias_key" ON "skill_aliases"("normalized_alias");

-- CreateIndex
CREATE INDEX "skill_aliases_skill_id_idx" ON "skill_aliases"("skill_id");

-- CreateIndex
CREATE INDEX "user_skills_skill_id_idx" ON "user_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

-- CreateIndex
CREATE INDEX "verified_skill_scores_skill_id_score_idx" ON "verified_skill_scores"("skill_id", "score");

-- CreateIndex
CREATE UNIQUE INDEX "verified_skill_scores_user_id_skill_id_key" ON "verified_skill_scores"("user_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "verified_skill_scores_calculation_id_user_id_skill_id_key" ON "verified_skill_scores"("calculation_id", "user_id", "skill_id");

-- CreateIndex
CREATE INDEX "verified_skill_score_calculations_user_id_skill_id_calculat_idx" ON "verified_skill_score_calculations"("user_id", "skill_id", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "verified_skill_score_calculations_id_user_id_skill_id_key" ON "verified_skill_score_calculations"("id", "user_id", "skill_id");

-- CreateIndex
CREATE INDEX "verified_skill_score_calculation_inputs_evaluation_id_idx" ON "verified_skill_score_calculation_inputs"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "verified_skill_score_calculation_inputs_calculation_id_eval_key" ON "verified_skill_score_calculation_inputs"("calculation_id", "evaluation_id");

-- CreateIndex
CREATE INDEX "assessments_owner_company_id_idx" ON "assessments"("owner_company_id");

-- CreateIndex
CREATE INDEX "assessments_owner_type_visibility_idx" ON "assessments"("owner_type", "visibility");

-- CreateIndex
CREATE INDEX "assessment_versions_status_idx" ON "assessment_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_versions_assessment_id_version_key" ON "assessment_versions"("assessment_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_version_id_position_key" ON "assessment_questions"("assessment_version_id", "position");

-- CreateIndex
CREATE INDEX "assessment_skills_skill_id_idx" ON "assessment_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_skills_assessment_version_id_skill_id_key" ON "assessment_skills"("assessment_version_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rubric_versions_assessment_version_id_version_key" ON "assessment_rubric_versions"("assessment_version_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rubric_versions_id_assessment_version_id_key" ON "assessment_rubric_versions"("id", "assessment_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rubric_criteria_rubric_version_id_key_key" ON "assessment_rubric_criteria"("rubric_version_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rubric_criteria_id_rubric_version_id_key" ON "assessment_rubric_criteria"("id", "rubric_version_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_candidate_user_id_status_idx" ON "assessment_attempts"("candidate_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_assessment_version_id_candidate_user_id_key" ON "assessment_attempts"("assessment_version_id", "candidate_user_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_id_rubric_version_id_key" ON "assessment_attempts"("id", "rubric_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_submissions_attempt_id_revision_key" ON "assessment_submissions"("attempt_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_submissions_id_attempt_id_key" ON "assessment_submissions"("id", "attempt_id");

-- CreateIndex
CREATE INDEX "assessment_submission_files_file_id_idx" ON "assessment_submission_files"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_submission_files_submission_id_file_id_key" ON "assessment_submission_files"("submission_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_supersedes_evaluation_id_key" ON "evaluations"("supersedes_evaluation_id");

-- CreateIndex
CREATE INDEX "evaluations_attempt_id_idx" ON "evaluations"("attempt_id");

-- CreateIndex
CREATE INDEX "evaluations_submission_id_idx" ON "evaluations"("submission_id");

-- CreateIndex
CREATE INDEX "evaluations_review_status_idx" ON "evaluations"("review_status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_id_rubric_version_id_key" ON "evaluations"("id", "rubric_version_id");

-- CreateIndex
CREATE INDEX "evaluation_criterion_scores_criterion_id_idx" ON "evaluation_criterion_scores"("criterion_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_criterion_scores_evaluation_id_criterion_id_key" ON "evaluation_criterion_scores"("evaluation_id", "criterion_id");

-- CreateIndex
CREATE INDEX "evaluation_evidence_evaluation_id_idx" ON "evaluation_evidence"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_evidence_criterion_score_id_idx" ON "evaluation_evidence"("criterion_score_id");

-- CreateIndex
CREATE INDEX "evaluation_reviews_evaluation_id_created_at_idx" ON "evaluation_reviews"("evaluation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_jobs_idempotency_key_key" ON "ai_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "ai_jobs_status_created_at_idx" ON "ai_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "ai_jobs_company_id_idx" ON "ai_jobs"("company_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_token_hash_key" ON "user_devices"("token_hash");

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");

-- CreateIndex
CREATE INDEX "file_assets_owner_user_id_idx" ON "file_assets"("owner_user_id");

-- CreateIndex
CREATE INDEX "file_assets_owner_company_id_idx" ON "file_assets"("owner_company_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_bucket_object_key_key" ON "file_assets"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_profile_image_file_id_fkey" FOREIGN KEY ("profile_image_file_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_education" ADD CONSTRAINT "candidate_education_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certificates" ADD CONSTRAINT "candidate_certificates_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certificates" ADD CONSTRAINT "candidate_certificates_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_portfolio_items" ADD CONSTRAINT "candidate_portfolio_items_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_portfolio_items" ADD CONSTRAINT "candidate_portfolio_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_availability" ADD CONSTRAINT "candidate_availability_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_privacy_settings" ADD CONSTRAINT "candidate_privacy_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "skill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_category_translations" ADD CONSTRAINT "skill_category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_translations" ADD CONSTRAINT "skill_translations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_scores" ADD CONSTRAINT "verified_skill_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_scores" ADD CONSTRAINT "verified_skill_scores_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_scores" ADD CONSTRAINT "verified_skill_scores_calculation_id_user_id_skill_id_fkey" FOREIGN KEY ("calculation_id", "user_id", "skill_id") REFERENCES "verified_skill_score_calculations"("id", "user_id", "skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_score_calculations" ADD CONSTRAINT "verified_skill_score_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_score_calculations" ADD CONSTRAINT "verified_skill_score_calculations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_score_calculation_inputs" ADD CONSTRAINT "verified_skill_score_calculation_inputs_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "verified_skill_score_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verified_skill_score_calculation_inputs" ADD CONSTRAINT "verified_skill_score_calculation_inputs_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_owner_company_id_fkey" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_skills" ADD CONSTRAINT "assessment_skills_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_skills" ADD CONSTRAINT "assessment_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_rubric_versions" ADD CONSTRAINT "assessment_rubric_versions_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_rubric_criteria" ADD CONSTRAINT "assessment_rubric_criteria_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "assessment_rubric_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_version_id_fkey" FOREIGN KEY ("assessment_version_id") REFERENCES "assessment_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_rubric_version_id_assessment_version_i_fkey" FOREIGN KEY ("rubric_version_id", "assessment_version_id") REFERENCES "assessment_rubric_versions"("id", "assessment_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_candidate_user_id_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_submission_files" ADD CONSTRAINT "assessment_submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_submission_files" ADD CONSTRAINT "assessment_submission_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_submission_id_attempt_id_fkey" FOREIGN KEY ("submission_id", "attempt_id") REFERENCES "assessment_submissions"("id", "attempt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_attempt_id_rubric_version_id_fkey" FOREIGN KEY ("attempt_id", "rubric_version_id") REFERENCES "assessment_attempts"("id", "rubric_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_user_id_fkey" FOREIGN KEY ("evaluator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_supersedes_evaluation_id_fkey" FOREIGN KEY ("supersedes_evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criterion_scores" ADD CONSTRAINT "evaluation_criterion_scores_evaluation_id_rubric_version_i_fkey" FOREIGN KEY ("evaluation_id", "rubric_version_id") REFERENCES "evaluations"("id", "rubric_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criterion_scores" ADD CONSTRAINT "evaluation_criterion_scores_criterion_id_rubric_version_id_fkey" FOREIGN KEY ("criterion_id", "rubric_version_id") REFERENCES "assessment_rubric_criteria"("id", "rubric_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_evidence" ADD CONSTRAINT "evaluation_evidence_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_evidence" ADD CONSTRAINT "evaluation_evidence_criterion_score_id_fkey" FOREIGN KEY ("criterion_score_id") REFERENCES "evaluation_criterion_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_evidence" ADD CONSTRAINT "evaluation_evidence_submission_file_id_fkey" FOREIGN KEY ("submission_file_id") REFERENCES "assessment_submission_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_reviews" ADD CONSTRAINT "evaluation_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assessment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_owner_company_id_fkey" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written rules that Prisma cannot express. Documented in docs/database.md.
-- ---------------------------------------------------------------------------

-- Format and range checks
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_anonymized_has_no_identity" CHECK ("status" <> 'ANONYMIZED' OR ("email" IS NULL AND "auth_subject" IS NULL AND "anonymized_at" IS NOT NULL));
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_country_code_format" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "companies_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "companies_website_url_format" CHECK ("website_url" ~ '^https?://');
ALTER TABLE "company_invitations"
  ADD CONSTRAINT "company_invitations_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "candidate_profiles"
  ADD CONSTRAINT "candidate_profiles_country_code_format" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "candidate_profiles_phone_format" CHECK ("phone_number" ~ '^\+[1-9][0-9]{6,14}$'),
  ADD CONSTRAINT "candidate_profiles_linkedin_url_format" CHECK ("linkedin_url" ~ '^https?://'),
  ADD CONSTRAINT "candidate_profiles_github_url_format" CHECK ("github_url" ~ '^https?://'),
  ADD CONSTRAINT "candidate_profiles_website_url_format" CHECK ("website_url" ~ '^https?://');
ALTER TABLE "candidate_experiences"
  ADD CONSTRAINT "candidate_experiences_dates" CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
  ADD CONSTRAINT "candidate_experiences_current_has_no_end" CHECK (NOT "is_current" OR "end_date" IS NULL);
ALTER TABLE "candidate_education"
  ADD CONSTRAINT "candidate_education_dates" CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date");
ALTER TABLE "candidate_certificates"
  ADD CONSTRAINT "candidate_certificates_dates" CHECK ("expires_on" IS NULL OR "issued_on" IS NULL OR "expires_on" >= "issued_on"),
  ADD CONSTRAINT "candidate_certificates_url_format" CHECK ("credential_url" ~ '^https?://');
ALTER TABLE "candidate_portfolio_items"
  ADD CONSTRAINT "candidate_portfolio_items_project_url_format" CHECK ("project_url" ~ '^https?://'),
  ADD CONSTRAINT "candidate_portfolio_items_repository_url_format" CHECK ("repository_url" ~ '^https?://');
ALTER TABLE "candidate_availability"
  ADD CONSTRAINT "candidate_availability_salary_range" CHECK (("salary_min" IS NULL OR "salary_min" >= 0) AND ("salary_max" IS NULL OR "salary_max" >= 0) AND ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_max" >= "salary_min")),
  ADD CONSTRAINT "candidate_availability_currency_format" CHECK ("salary_currency" ~ '^[A-Z]{3}$');
ALTER TABLE "skill_categories"
  ADD CONSTRAINT "skill_categories_not_own_parent" CHECK ("parent_id" <> "id");
ALTER TABLE "skill_aliases"
  ADD CONSTRAINT "skill_aliases_normalized" CHECK ("normalized_alias" = lower(btrim("normalized_alias")));
ALTER TABLE "user_skills"
  ADD CONSTRAINT "user_skills_years_range" CHECK ("years_of_experience" >= 0);
ALTER TABLE "verified_skill_scores"
  ADD CONSTRAINT "verified_skill_scores_score_range" CHECK ("score" BETWEEN 0 AND 100),
  ADD CONSTRAINT "verified_skill_scores_confidence_range" CHECK ("confidence" BETWEEN 0 AND 100),
  ADD CONSTRAINT "verified_skill_scores_count_positive" CHECK ("assessment_count" > 0);
ALTER TABLE "verified_skill_score_calculations"
  ADD CONSTRAINT "verified_skill_score_calculations_score_range" CHECK ("score" BETWEEN 0 AND 100),
  ADD CONSTRAINT "verified_skill_score_calculations_confidence_range" CHECK ("confidence" BETWEEN 0 AND 100),
  ADD CONSTRAINT "verified_skill_score_calculations_count_positive" CHECK ("assessment_count" > 0);
ALTER TABLE "verified_skill_score_calculation_inputs"
  ADD CONSTRAINT "verified_skill_score_calculation_inputs_weight_range" CHECK ("weight" > 0 AND "weight" <= 100);
ALTER TABLE "assessments"
  ADD CONSTRAINT "assessments_company_owner_matches_type" CHECK (("owner_type" = 'COMPANY') = ("owner_company_id" IS NOT NULL));
ALTER TABLE "assessment_versions"
  ADD CONSTRAINT "assessment_versions_version_positive" CHECK ("version" >= 1),
  ADD CONSTRAINT "assessment_versions_duration_positive" CHECK ("duration_minutes" > 0),
  ADD CONSTRAINT "assessment_versions_max_attempts_positive" CHECK ("max_attempts" >= 1),
  ADD CONSTRAINT "assessment_versions_ttl_positive" CHECK ("attempt_ttl_hours" > 0),
  ADD CONSTRAINT "assessment_versions_published_has_date" CHECK ("status" = 'DRAFT' OR "published_at" IS NOT NULL);
ALTER TABLE "assessment_questions"
  ADD CONSTRAINT "assessment_questions_position_positive" CHECK ("position" >= 1);
ALTER TABLE "assessment_skills"
  ADD CONSTRAINT "assessment_skills_weight_range" CHECK ("weight" > 0 AND "weight" <= 100);
ALTER TABLE "assessment_rubric_versions"
  ADD CONSTRAINT "assessment_rubric_versions_version_positive" CHECK ("version" >= 1);
ALTER TABLE "assessment_rubric_criteria"
  ADD CONSTRAINT "assessment_rubric_criteria_weight_range" CHECK ("weight" > 0 AND "weight" <= 100);
ALTER TABLE "assessment_attempts"
  ADD CONSTRAINT "assessment_attempts_number_positive" CHECK ("attempt_number" >= 1),
  ADD CONSTRAINT "assessment_attempts_expiry_after_start" CHECK ("expires_at" IS NULL OR "expires_at" > "started_at");
ALTER TABLE "assessment_submissions"
  ADD CONSTRAINT "assessment_submissions_revision_positive" CHECK ("revision" >= 1),
  ADD CONSTRAINT "assessment_submissions_erased_has_no_content" CHECK ("content_erased_at" IS NULL OR "responses" IS NULL);
ALTER TABLE "evaluations"
  ADD CONSTRAINT "evaluations_overall_score_range" CHECK ("overall_score" BETWEEN 0 AND 100),
  ADD CONSTRAINT "evaluations_confidence_range" CHECK ("confidence" BETWEEN 0 AND 100),
  ADD CONSTRAINT "evaluations_completed_has_result" CHECK ("status" <> 'COMPLETED' OR ("overall_score" IS NOT NULL AND "completed_at" IS NOT NULL)),
  ADD CONSTRAINT "evaluations_ai_has_metadata" CHECK ("evaluator_type" <> 'AI' OR ("provider" IS NOT NULL AND "model_name" IS NOT NULL)),
  ADD CONSTRAINT "evaluations_human_has_evaluator" CHECK ("evaluator_type" <> 'HUMAN' OR "evaluator_user_id" IS NOT NULL);
ALTER TABLE "evaluation_criterion_scores"
  ADD CONSTRAINT "evaluation_criterion_scores_score_range" CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "evaluation_evidence"
  ADD CONSTRAINT "evaluation_evidence_erased_has_no_content" CHECK ("content_erased_at" IS NULL OR "excerpt" IS NULL);
ALTER TABLE "ai_jobs"
  ADD CONSTRAINT "ai_jobs_tokens_not_negative" CHECK (("input_tokens" IS NULL OR "input_tokens" >= 0) AND ("output_tokens" IS NULL OR "output_tokens" >= 0)),
  ADD CONSTRAINT "ai_jobs_cost_not_negative" CHECK ("estimated_cost" >= 0),
  ADD CONSTRAINT "ai_jobs_retry_not_negative" CHECK ("retry_count" >= 0);
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_metadata_size" CHECK ("metadata" IS NULL OR octet_length("metadata"::text) <= 16384);
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_payload_size" CHECK ("payload" IS NULL OR octet_length("payload"::text) <= 4096);
ALTER TABLE "file_assets"
  ADD CONSTRAINT "file_assets_one_owner" CHECK (num_nonnulls("owner_user_id", "owner_company_id") = 1),
  ADD CONSTRAINT "file_assets_size_not_negative" CHECK ("size_bytes" >= 0),
  ADD CONSTRAINT "file_assets_sha256_format" CHECK ("sha256" ~ '^[a-f0-9]{64}$');

-- Only one open invitation per person per company
CREATE UNIQUE INDEX "company_invitations_one_pending" ON "company_invitations"("company_id", "email") WHERE "status" = 'PENDING';

-- Append-only tables
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END $$;

CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER evaluation_reviews_immutable BEFORE UPDATE OR DELETE ON "evaluation_reviews"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER verified_skill_score_calculations_immutable BEFORE UPDATE OR DELETE ON "verified_skill_score_calculations"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER verified_skill_score_calculation_inputs_immutable BEFORE UPDATE OR DELETE ON "verified_skill_score_calculation_inputs"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER assessment_submission_files_immutable BEFORE UPDATE OR DELETE ON "assessment_submission_files"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Skill categories must form a tree
CREATE FUNCTION prevent_skill_category_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."parent_id" IS NOT NULL AND EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT "id", "parent_id" FROM "skill_categories" WHERE "id" = NEW."parent_id"
      UNION
      SELECT c."id", c."parent_id" FROM "skill_categories" c JOIN ancestors a ON c."id" = a."parent_id"
    ) SELECT 1 FROM ancestors WHERE "id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'skill category cycle';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER skill_categories_no_cycle BEFORE INSERT OR UPDATE OF "parent_id" ON "skill_categories"
  FOR EACH ROW EXECUTE FUNCTION prevent_skill_category_cycle();

-- Published assessment versions are frozen, apart from moving to ARCHIVED
CREATE FUNCTION guard_assessment_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN RAISE EXCEPTION 'published assessment version is immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" <> 'DRAFT' AND (
    NEW."status" = 'DRAFT'
    OR (to_jsonb(NEW) - ARRAY['status','archived_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','archived_at','updated_at'])
  ) THEN
    RAISE EXCEPTION 'published assessment version is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_versions_guard BEFORE UPDATE OR DELETE ON "assessment_versions"
  FOR EACH ROW EXECUTE FUNCTION guard_assessment_version();

CREATE FUNCTION guard_assessment_version_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_version_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN row_version_id := OLD."assessment_version_id"; ELSE row_version_id := NEW."assessment_version_id"; END IF;
  IF EXISTS (SELECT 1 FROM "assessment_versions" WHERE "id" = row_version_id AND "status" <> 'DRAFT') THEN
    RAISE EXCEPTION 'published assessment version is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_questions_guard BEFORE INSERT OR UPDATE OR DELETE ON "assessment_questions"
  FOR EACH ROW EXECUTE FUNCTION guard_assessment_version_child();
CREATE TRIGGER assessment_skills_guard BEFORE INSERT OR UPDATE OR DELETE ON "assessment_skills"
  FOR EACH ROW EXECUTE FUNCTION guard_assessment_version_child();

-- A rubric freezes when published, and its weights must total 100
CREATE FUNCTION guard_rubric_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."published_at" IS NOT NULL THEN RAISE EXCEPTION 'published rubric is immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."published_at" IS NOT NULL THEN RAISE EXCEPTION 'published rubric is immutable'; END IF;
  IF NEW."published_at" IS NOT NULL AND
    (SELECT coalesce(sum("weight"), 0) FROM "assessment_rubric_criteria" WHERE "rubric_version_id" = NEW."id") <> 100 THEN
    RAISE EXCEPTION 'rubric criterion weights must total 100';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_rubric_versions_guard BEFORE UPDATE OR DELETE ON "assessment_rubric_versions"
  FOR EACH ROW EXECUTE FUNCTION guard_rubric_version();

CREATE FUNCTION guard_rubric_criterion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_rubric_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN row_rubric_id := OLD."rubric_version_id"; ELSE row_rubric_id := NEW."rubric_version_id"; END IF;
  IF EXISTS (SELECT 1 FROM "assessment_rubric_versions" WHERE "id" = row_rubric_id AND "published_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'published rubric is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_rubric_criteria_guard BEFORE INSERT OR UPDATE OR DELETE ON "assessment_rubric_criteria"
  FOR EACH ROW EXECUTE FUNCTION guard_rubric_criterion();

-- Attempts need published content, and cannot exceed the attempt limit
CREATE FUNCTION guard_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v "assessment_versions"%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."assessment_version_id" <> OLD."assessment_version_id" OR NEW."rubric_version_id" <> OLD."rubric_version_id"
      OR NEW."candidate_user_id" <> OLD."candidate_user_id" OR NEW."attempt_number" <> OLD."attempt_number" THEN
      RAISE EXCEPTION 'attempt identity is immutable';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO v FROM "assessment_versions" WHERE "id" = NEW."assessment_version_id";
  IF v."status" <> 'PUBLISHED' THEN RAISE EXCEPTION 'assessment version is not published'; END IF;
  IF NEW."attempt_number" > v."max_attempts" THEN RAISE EXCEPTION 'maximum attempts exceeded'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "assessment_rubric_versions" WHERE "id" = NEW."rubric_version_id" AND "published_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'rubric is not published';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_attempts_guard BEFORE INSERT OR UPDATE ON "assessment_attempts"
  FOR EACH ROW EXECUTE FUNCTION guard_attempt();

-- Submissions are immutable, except that their content can be erased
CREATE FUNCTION guard_submission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  a "assessment_attempts"%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'submission is immutable'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW."responses" IS NOT NULL OR NEW."content_erased_at" IS NULL
      OR NEW."id" <> OLD."id" OR NEW."attempt_id" <> OLD."attempt_id" OR NEW."revision" <> OLD."revision" OR NEW."submitted_at" <> OLD."submitted_at" THEN
      RAISE EXCEPTION 'submission is immutable';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO a FROM "assessment_attempts" WHERE "id" = NEW."attempt_id";
  IF a."status" <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'attempt is not in progress'; END IF;
  IF a."expires_at" IS NOT NULL AND a."expires_at" <= now() THEN RAISE EXCEPTION 'attempt has expired'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_submissions_guard BEFORE INSERT OR UPDATE OR DELETE ON "assessment_submissions"
  FOR EACH ROW EXECUTE FUNCTION guard_submission();

-- A submitted file must belong to the candidate who made the attempt
CREATE FUNCTION guard_submission_file_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "assessment_submissions" s
    JOIN "assessment_attempts" a ON a."id" = s."attempt_id"
    JOIN "file_assets" f ON f."id" = NEW."file_id"
    WHERE s."id" = NEW."submission_id" AND f."owner_user_id" = a."candidate_user_id"
  ) THEN
    RAISE EXCEPTION 'file does not belong to the candidate';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assessment_submission_files_owner BEFORE INSERT ON "assessment_submission_files"
  FOR EACH ROW EXECUTE FUNCTION guard_submission_file_owner();

-- Evaluations start PENDING and freeze when finished. Only review_status can change afterwards.
CREATE FUNCTION guard_evaluation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'PENDING' THEN RAISE EXCEPTION 'finished evaluation is immutable'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDING' THEN RAISE EXCEPTION 'evaluation must start as pending'; END IF;
    IF NEW."supersedes_evaluation_id" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "evaluations" WHERE "id" = NEW."supersedes_evaluation_id" AND "attempt_id" = NEW."attempt_id" AND "status" = 'COMPLETED'
    ) THEN
      RAISE EXCEPTION 'superseded evaluation must be a completed evaluation of the same attempt';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."status" <> 'PENDING' THEN
    IF (to_jsonb(NEW) - ARRAY['review_status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['review_status','updated_at']) THEN
      RAISE EXCEPTION 'finished evaluation is immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW."status" = 'COMPLETED' AND NOT EXISTS (SELECT 1 FROM "evaluation_criterion_scores" WHERE "evaluation_id" = NEW."id") THEN
    RAISE EXCEPTION 'completed evaluation needs criterion scores';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER evaluations_guard BEFORE INSERT OR UPDATE OR DELETE ON "evaluations"
  FOR EACH ROW EXECUTE FUNCTION guard_evaluation();

CREATE FUNCTION guard_criterion_score() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_evaluation_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN row_evaluation_id := OLD."evaluation_id"; ELSE row_evaluation_id := NEW."evaluation_id"; END IF;
  IF EXISTS (SELECT 1 FROM "evaluations" WHERE "id" = row_evaluation_id AND "status" <> 'PENDING') THEN
    RAISE EXCEPTION 'finished evaluation is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER evaluation_criterion_scores_guard BEFORE INSERT OR UPDATE OR DELETE ON "evaluation_criterion_scores"
  FOR EACH ROW EXECUTE FUNCTION guard_criterion_score();

-- Evidence must point inside its own evaluation. After completion only erasure is allowed.
CREATE FUNCTION guard_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  finished boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT "status" <> 'PENDING' INTO finished FROM "evaluations" WHERE "id" = OLD."evaluation_id";
    IF finished THEN RAISE EXCEPTION 'finished evaluation is immutable'; END IF;
    RETURN OLD;
  END IF;
  SELECT "status" <> 'PENDING' INTO finished FROM "evaluations" WHERE "id" = NEW."evaluation_id";
  IF TG_OP = 'UPDATE' AND finished THEN
    IF NEW."excerpt" IS NOT NULL OR NEW."content_erased_at" IS NULL
      OR (to_jsonb(NEW) - ARRAY['excerpt','content_erased_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['excerpt','content_erased_at']) THEN
      RAISE EXCEPTION 'finished evaluation is immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF finished THEN RAISE EXCEPTION 'finished evaluation is immutable'; END IF;
  IF NEW."criterion_score_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "evaluation_criterion_scores" WHERE "id" = NEW."criterion_score_id" AND "evaluation_id" = NEW."evaluation_id"
  ) THEN
    RAISE EXCEPTION 'criterion score belongs to another evaluation';
  END IF;
  IF NEW."submission_file_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "assessment_submission_files" f JOIN "evaluations" e ON e."submission_id" = f."submission_id"
    WHERE f."id" = NEW."submission_file_id" AND e."id" = NEW."evaluation_id"
  ) THEN
    RAISE EXCEPTION 'file belongs to another submission';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER evaluation_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON "evaluation_evidence"
  FOR EACH ROW EXECUTE FUNCTION guard_evidence();

-- Reviews apply to finished work and set the evaluation's review status
CREATE FUNCTION apply_evaluation_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "evaluations" WHERE "id" = NEW."evaluation_id" AND "status" = 'COMPLETED') THEN
    RAISE EXCEPTION 'only completed evaluations can be reviewed';
  END IF;
  UPDATE "evaluations" SET "review_status" = CASE NEW."decision"
    WHEN 'APPROVED' THEN 'APPROVED'::"EvaluationReviewStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"EvaluationReviewStatus"
    ELSE 'PENDING'::"EvaluationReviewStatus" END
  WHERE "id" = NEW."evaluation_id";
  RETURN NEW;
END $$;
CREATE TRIGGER evaluation_reviews_apply BEFORE INSERT ON "evaluation_reviews"
  FOR EACH ROW EXECUTE FUNCTION apply_evaluation_review();

-- Verified scores: inputs must be real evidence for this candidate and skill
CREATE FUNCTION guard_score_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "verified_skill_score_calculations" c
    JOIN "evaluations" e ON e."id" = NEW."evaluation_id"
    JOIN "assessment_attempts" a ON a."id" = e."attempt_id"
    JOIN "assessment_skills" s ON s."assessment_version_id" = a."assessment_version_id" AND s."skill_id" = c."skill_id"
    WHERE c."id" = NEW."calculation_id" AND a."candidate_user_id" = c."user_id"
      AND e."status" = 'COMPLETED' AND e."review_status" <> 'REJECTED'
  ) THEN
    RAISE EXCEPTION 'evaluation is not valid evidence for this verified score';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER verified_skill_score_inputs_guard BEFORE INSERT ON "verified_skill_score_calculation_inputs"
  FOR EACH ROW EXECUTE FUNCTION guard_score_input();

-- Checked at commit, so a calculation and its inputs can be written in one transaction
CREATE FUNCTION require_score_inputs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "verified_skill_score_calculation_inputs" WHERE "calculation_id" = NEW."id") THEN
    RAISE EXCEPTION 'verified score calculation needs evaluation evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER verified_skill_score_calculations_have_inputs
  AFTER INSERT ON "verified_skill_score_calculations"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_score_inputs();

-- Current scores always copy their calculation, so direct edits have no effect
CREATE FUNCTION sync_verified_score() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c "verified_skill_score_calculations"%ROWTYPE;
BEGIN
  SELECT * INTO c FROM "verified_skill_score_calculations" WHERE "id" = NEW."calculation_id";
  IF NOT FOUND THEN RAISE EXCEPTION 'verified score needs a calculation'; END IF;
  NEW."score" := c."score";
  NEW."confidence" := c."confidence";
  NEW."assessment_count" := c."assessment_count";
  NEW."highest_difficulty" := c."highest_difficulty";
  NEW."last_verified_at" := c."calculated_at";
  RETURN NEW;
END $$;
CREATE TRIGGER verified_skill_scores_sync BEFORE INSERT OR UPDATE ON "verified_skill_scores"
  FOR EACH ROW EXECUTE FUNCTION sync_verified_score();
