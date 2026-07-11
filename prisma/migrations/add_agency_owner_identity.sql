-- ============================================================
-- Migration: Agency owner identity fields
-- Adds owner name / mobile and national ID (type + number) to agencies.
-- Additive & backward-compatible — all columns nullable, no backfill.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE "agencies"
  ADD COLUMN IF NOT EXISTS "owner_name"         TEXT,
  ADD COLUMN IF NOT EXISTS "owner_mobile"       TEXT,
  ADD COLUMN IF NOT EXISTS "national_id_type"   TEXT,
  ADD COLUMN IF NOT EXISTS "national_id_number" TEXT;
