-- ============================================================
-- Migration: Student budget minimum (fee range)
-- The existing `budget` is the max fee; this adds the min so leads can hold a
-- fee range. Additive/idempotent.
-- Run via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "budget_min" DECIMAL(12,2);

-- Done.
