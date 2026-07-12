-- ============================================================
-- Migration: Course Catalog (master reference list)
-- A reference repository of standard India courses used to populate the
-- college "Add Course" picker. Not tied to any college.
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS "course_catalog" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "degreeType"  "DegreeType" NOT NULL,
  "field"       TEXT,
  "duration"    TEXT,
  "is_active"   BOOLEAN     NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "course_catalog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_catalog_name_degreeType_key" UNIQUE ("name", "degreeType")
);

CREATE INDEX IF NOT EXISTS "idx_course_catalog_name" ON "course_catalog"("name");

-- Done.
