-- Additive only: two list columns with defaults. No existing data is changed.

-- AlterTable
ALTER TABLE "candidate_portfolio_items" ADD COLUMN     "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Hand-written. Prisma cannot express these and `migrate diff` does not see them.
-- The lists are never null, hold at most 15 entries, and each entry is 1 to 40 characters.
CREATE FUNCTION "text_list_is_valid"(list TEXT[], max_items INTEGER, max_length INTEGER) RETURNS BOOLEAN
  LANGUAGE sql IMMUTABLE AS $$
    SELECT list IS NOT NULL
      AND cardinality(list) <= max_items
      AND NOT EXISTS (SELECT 1 FROM unnest(list) AS item WHERE item IS NULL OR char_length(item) NOT BETWEEN 1 AND max_length)
  $$;

ALTER TABLE "candidate_profiles"
  ADD CONSTRAINT "candidate_profiles_interests_valid" CHECK ("text_list_is_valid"("interests", 15, 40));
ALTER TABLE "candidate_portfolio_items"
  ADD CONSTRAINT "candidate_portfolio_items_technologies_valid" CHECK ("text_list_is_valid"("technologies", 15, 40));
