-- ============================================================
-- Migration: Lead expected closing date
-- Adds an optional expected-closing-date captured on the Add Lead form.
-- Additive/idempotent.
-- Run in Supabase SQL Editor or via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expected_closing_date" TIMESTAMP(3);

-- Done.
