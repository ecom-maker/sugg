ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3);
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "terms_accepted_by_id" TEXT;
