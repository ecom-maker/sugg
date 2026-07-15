-- ============================================================
-- Migration: Student shortlisted college
-- Stores the college shortlisted for a student (set when a lead moves to
-- COLLEGE_SHORTLISTED). Additive/idempotent.
-- Run via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "shortlisted_college" TEXT;

-- Done.
