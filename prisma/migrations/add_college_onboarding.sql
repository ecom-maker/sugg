-- ============================================================
-- Migration: College Onboarding & Approval System
-- Run this in Supabase SQL Editor AFTER add_multi_tenant_agency.sql
-- ============================================================

-- 1. Add new columns to colleges table
ALTER TABLE "colleges"
  ADD COLUMN IF NOT EXISTS "contact_person_name"  TEXT,
  ADD COLUMN IF NOT EXISTS "contact_person_desig"  TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "mobile_verified"       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "verification_token"    TEXT,
  ADD COLUMN IF NOT EXISTS "verification_expiry"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "banner_url"            TEXT,
  ADD COLUMN IF NOT EXISTS "approved_by_id"        TEXT,
  ADD COLUMN IF NOT EXISTS "social_links_json"     JSONB;

-- 2. Create college_users table for multi-user support
CREATE TABLE IF NOT EXISTS "college_users" (
  "id"          TEXT NOT NULL,
  "college_id"  TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "designation" TEXT,
  "permissions" JSONB,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "college_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "college_users_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "college_users_college_id_fkey"
    FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE CASCADE,
  CONSTRAINT "college_users_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_college_users_college_id" ON "college_users"("college_id");

-- 3. Populate college_users from existing adminId links
INSERT INTO "college_users" ("id", "college_id", "user_id", "designation", "created_at")
SELECT
  gen_random_uuid()::TEXT,
  c."id",
  c."admin_id",
  'College Admin',
  NOW()
FROM "colleges" c
WHERE c."admin_id" IS NOT NULL
ON CONFLICT ("user_id") DO NOTHING;

-- Done!
