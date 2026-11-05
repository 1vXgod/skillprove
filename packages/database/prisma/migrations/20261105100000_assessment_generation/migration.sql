-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('KNOWLEDGE', 'PRACTICAL', 'SCENARIO_BASED');
-- DropIndex
DROP INDEX "ai_jobs_company_id_idx";
-- AlterTable
ALTER TABLE "ai_jobs" ADD COLUMN     "assessment_id" UUID,
ADD COLUMN     "input" JSONB;
-- AlterTable
ALTER TABLE "assessment_questions" ADD COLUMN     "difficulty" "DifficultyLevel",
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "skill_id" UUID;
-- AlterTable
ALTER TABLE "assessment_rubric_criteria" ADD COLUMN     "max_score" DECIMAL(5,2),
ADD COLUMN     "scoring_guidance" TEXT,
ADD COLUMN     "skill_id" UUID;
-- AlterTable
ALTER TABLE "assessment_versions" ADD COLUMN     "ai_job_id" UUID,
ADD COLUMN     "assessment_type" "AssessmentType";
-- CreateIndex
CREATE INDEX "ai_jobs_requested_by_id_created_at_idx" ON "ai_jobs"("requested_by_id", "created_at");
-- CreateIndex
CREATE INDEX "ai_jobs_company_id_created_at_idx" ON "ai_jobs"("company_id", "created_at");
-- AddForeignKey
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "assessment_rubric_criteria" ADD CONSTRAINT "assessment_rubric_criteria_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written constraints (invisible to `migrate diff`). Additive: every new column is nullable.
ALTER TABLE "assessment_questions"
  ADD CONSTRAINT "assessment_questions_estimated_minutes_positive" CHECK ("estimated_minutes" IS NULL OR "estimated_minutes" > 0);
ALTER TABLE "assessment_rubric_criteria"
  ADD CONSTRAINT "assessment_rubric_criteria_max_score_positive" CHECK ("max_score" IS NULL OR "max_score" > 0);
ALTER TABLE "ai_jobs"
  ADD CONSTRAINT "ai_jobs_input_size" CHECK ("input" IS NULL OR octet_length("input"::text) <= 16384);
-- At most one open draft per assessment, even under concurrent requests.
CREATE UNIQUE INDEX "assessment_versions_one_draft" ON "assessment_versions"("assessment_id") WHERE "status" = 'DRAFT';
