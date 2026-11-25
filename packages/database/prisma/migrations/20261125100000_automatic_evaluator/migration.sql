-- Additive only: a third evaluator type for scores computed by code from the answer key,
-- with no AI provider and no human evaluator. No existing row, constraint or trigger changes.
ALTER TYPE "EvaluatorType" ADD VALUE 'AUTOMATIC';

-- An automatic evaluation names no provider, model, AI job or person, and records the
-- scoring formula version in prompt_version so the result stays explainable.
-- Compared as text: PostgreSQL does not allow a new enum value to be used in the same
-- transaction that adds it.
ALTER TABLE "evaluations"
  ADD CONSTRAINT "evaluations_automatic_has_formula_only" CHECK (
    "evaluator_type"::text <> 'AUTOMATIC' OR (
      "provider" IS NULL
      AND "model_name" IS NULL
      AND "ai_job_id" IS NULL
      AND "evaluator_user_id" IS NULL
      AND "prompt_version" IS NOT NULL
    )
  );
