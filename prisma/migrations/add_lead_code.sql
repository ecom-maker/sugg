-- ============================================================
-- Migration: Lead reference code (LEAD-00001)
-- A human-readable, unique lead reference used across the app. Assigned by a
-- Postgres sequence default, so every lead — from any creation path — gets one,
-- and existing leads are backfilled on ADD COLUMN (volatile default per row).
-- Run via `prisma db execute --url "$DIRECT_URL"`.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS lead_code_seq;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "code" TEXT
  DEFAULT ('LEAD-' || lpad(nextval('lead_code_seq')::text, 5, '0'));

-- Backfill any rows still missing a code (e.g. if the column pre-existed).
UPDATE "leads"
SET "code" = 'LEAD-' || lpad(nextval('lead_code_seq')::text, 5, '0')
WHERE "code" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_code_key" ON "leads"("code");

-- Done.
