-- ============================================================
-- Migration: University Management Module
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new enums
DO $$ BEGIN
  CREATE TYPE "UniversityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UniversityType" AS ENUM ('PUBLIC', 'PRIVATE', 'DEEMED', 'AUTONOMOUS', 'INTERNATIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create universities table
CREATE TABLE IF NOT EXISTS "universities" (
  "id"                  TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "name"                TEXT         NOT NULL,
  "establishment_year"  INTEGER      NOT NULL,
  "location"            TEXT         NOT NULL,
  "city"                TEXT,
  "state"               TEXT,
  "country"             TEXT         NOT NULL,
  "website"             TEXT,
  "university_type"     "UniversityType",
  "accreditation"       TEXT,
  "logo_url"            TEXT,
  "description"         TEXT,
  "status"              "UniversityStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by"          TEXT,
  "updated_by"          TEXT,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "universities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "universities_name_key" UNIQUE ("name"),
  CONSTRAINT "universities_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "universities_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- 3. Add university_id to colleges (nullable for backward compatibility)
ALTER TABLE "colleges"
  ADD COLUMN IF NOT EXISTS "university_id" TEXT,
  ADD CONSTRAINT "colleges_university_id_fkey"
    FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "idx_universities_status"  ON "universities"("status");
CREATE INDEX IF NOT EXISTS "idx_universities_country" ON "universities"("country");
CREATE INDEX IF NOT EXISTS "idx_colleges_university"  ON "colleges"("university_id") WHERE "university_id" IS NOT NULL;

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_universities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_universities_updated_at ON "universities";
CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON "universities"
  FOR EACH ROW EXECUTE FUNCTION update_universities_updated_at();
