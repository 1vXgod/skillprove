-- Additive only: per-skill results of automatic evaluations, so verified scores can be
-- recalculated from stored results without re-scoring old answers (Milestone 7, slice 9).
-- No existing row, constraint or trigger changes.

-- CreateTable
CREATE TABLE "evaluation_skill_results" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "question_count" INTEGER NOT NULL,
    "answered_count" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "evaluation_skill_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluation_skill_results_skill_id_idx" ON "evaluation_skill_results"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_skill_results_evaluation_id_skill_id_key" ON "evaluation_skill_results"("evaluation_id", "skill_id");

-- AddForeignKey
ALTER TABLE "evaluation_skill_results" ADD CONSTRAINT "evaluation_skill_results_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_skill_results" ADD CONSTRAINT "evaluation_skill_results_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written below: `migrate diff` cannot see these. See docs/database.md.

-- Counts must describe a real result: at least one question, no more answered than asked,
-- no more correct than answered, and a percentage that fits 0 to 100.
ALTER TABLE "evaluation_skill_results"
  ADD CONSTRAINT "evaluation_skill_results_counts_valid" CHECK (
    "question_count" > 0
    AND "answered_count" BETWEEN 0 AND "question_count"
    AND "correct_count" BETWEEN 0 AND "answered_count"
    AND "percent" BETWEEN 0 AND 100
  );

-- Like criterion scores, skill results can be written only while their evaluation is pending,
-- and are frozen once it finishes. guard_criterion_score() checks exactly that for any table
-- with an evaluation_id column, so it is reused here.
CREATE TRIGGER evaluation_skill_results_guard BEFORE INSERT OR UPDATE OR DELETE ON "evaluation_skill_results"
  FOR EACH ROW EXECUTE FUNCTION guard_criterion_score();

-- Scoring runs again if the first run is lost, so the database keeps it idempotent: an attempt
-- gets at most one original automatic evaluation. A later re-score must supersede it.
CREATE UNIQUE INDEX "evaluations_one_automatic_per_attempt" ON "evaluations"("attempt_id")
  WHERE "evaluator_type" = 'AUTOMATIC' AND "supersedes_evaluation_id" IS NULL;
