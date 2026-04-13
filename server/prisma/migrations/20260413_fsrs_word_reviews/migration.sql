-- Drop old SM-2 columns
ALTER TABLE "word_reviews" DROP COLUMN IF EXISTS "ease_factor";
ALTER TABLE "word_reviews" DROP COLUMN IF EXISTS "interval";
ALTER TABLE "word_reviews" DROP COLUMN IF EXISTS "repetitions";
ALTER TABLE "word_reviews" DROP COLUMN IF EXISTS "next_review";
ALTER TABLE "word_reviews" DROP COLUMN IF EXISTS "last_reviewed";

-- Add FSRS card columns
ALTER TABLE "word_reviews" ADD COLUMN "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "word_reviews" ADD COLUMN "stability" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "elapsed_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "scheduled_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "reps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "state" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "word_reviews" ADD COLUMN "last_review" TIMESTAMP(3);
